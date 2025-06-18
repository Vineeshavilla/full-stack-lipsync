import argparse
import math
import os
import platform
import subprocess
import time
import torch

import cv2
import numpy as np
from tqdm import tqdm

import audio
from models import Wav2Lip
from batch_face import RetinaFace

parser = argparse.ArgumentParser(description='Optimized Wav2Lip inference for faster processing')

parser.add_argument('--checkpoint_path', type=str, 
                    help='Name of saved checkpoint to load weights from', required=True)

parser.add_argument('--face', type=str, 
                    help='Filepath of video/image that contains faces to use', required=True)
parser.add_argument('--audio', type=str, 
                    help='Filepath of video/audio file to use as raw audio source', required=True)
parser.add_argument('--outfile', type=str, help='Video path to save result. See default for an e.g.', 
                                default='results/result_voice.mp4')

parser.add_argument('--static', type=bool, 
                    help='If True, then use only first video frame for inference', default=False)
parser.add_argument('--fps', type=float, help='Can be specified only if input is a static image (default: 25)', 
                    default=25., required=False)

parser.add_argument('--pads', nargs='+', type=int, default=[0, 10, 0, 0], 
                    help='Padding (top, bottom, left, right). Please adjust to include chin at least')

parser.add_argument('--wav2lip_batch_size', type=int, help='Batch size for Wav2Lip model(s)', default=128)

parser.add_argument('--resize_factor', default=1, type=int,
             help='Reduce the resolution by this factor. Sometimes, best results are obtained at 480p or 720p')

parser.add_argument('--out_height', default=480, type=int,
            help='Output video height. Best results are obtained at 480 or 720')

parser.add_argument('--optimization_level', type=str, default='fast',
                    help='Optimization level: fast, balanced, quality')

# Additional optimization arguments
parser.add_argument('--face_det_batch_size', type=int, default=256,
                    help='Batch size for face detection (larger = faster)')

parser.add_argument('--use_mixed_precision', type=bool, default=True,
                    help='Use mixed precision for faster inference')

parser.add_argument('--num_workers', type=int, default=4,
                    help='Number of workers for data loading')

args = parser.parse_args()

# Set optimization settings based on level
if args.optimization_level == "fast":
    args.wav2lip_batch_size = 128
    args.face_det_batch_size = 256
    args.out_height = 360
    args.fps = 24
elif args.optimization_level == "balanced":
    args.wav2lip_batch_size = 96
    args.face_det_batch_size = 128
    args.out_height = 540
    args.fps = 25
else:  # quality
    args.wav2lip_batch_size = 64
    args.face_det_batch_size = 64
    args.out_height = 720
    args.fps = 30

mel_step_size = 16
device = 'cuda' if torch.cuda.is_available() else 'cpu'
print(f'Using {device} for inference with {args.optimization_level} optimization')

# Enable mixed precision for faster inference
if args.use_mixed_precision and device == 'cuda':
    torch.backends.cudnn.benchmark = True
    torch.backends.cudnn.deterministic = False

def _load(checkpoint_path):
    if device == 'cuda':
        checkpoint = torch.load(checkpoint_path)
    else:
        checkpoint = torch.load(checkpoint_path,
                                map_location=lambda storage, loc: storage)
    return checkpoint

def load_model(path):
    model = Wav2Lip()
    print("Load checkpoint from: {}".format(path))
    checkpoint = _load(path)
    s = checkpoint["state_dict"]
    new_s = {}
    for k, v in s.items():
        new_s[k.replace('module.', '')] = v
    model.load_state_dict(new_s)

    model = model.to(device)
    if args.use_mixed_precision and device == 'cuda':
        model = model.half()  # Use half precision
    return model.eval()

def get_smoothened_boxes(boxes, T):
    for i in range(len(boxes)):
        if i + T > len(boxes):
            window = boxes[len(boxes) - T:]
        else:
            window = boxes[i : i + T]
        boxes[i] = np.mean(window, axis=0)
    return boxes

def face_detect(images):
    detector = RetinaFace(gpu_id=0, model_path="checkpoints/mobilenet.pth", network="mobilenet")
    
    batch_size = args.face_det_batch_size
    results = []
    
    # Process images in larger batches for better GPU utilization
    for i in range(0, len(images), batch_size):
        batch = images[i:i + batch_size]
        batch_results = detector(batch)
        results.extend(batch_results)
    
    boxes = []
    for result in results:
        if result:
            box, landmarks, score = result[0]
            boxes.append(tuple(map(int, box)))
        else:
            boxes.append(None)
    
    # Smooth face detections
    boxes = get_smoothened_boxes(boxes, T=5)
    
    results = []
    for i, box in enumerate(boxes):
        if box is None:
            results.append([None, None, False])
            continue
        
        y1, y2, x1, x2 = box
        face = images[i][y1:y2, x1:x2]
        results.append([face, box, True])
    
    return results

def datagen(frames, mels):
    img_batch, mel_batch, frame_batch, coords_batch = [], [], [], []

    if args.box[0] == -1:
        if not args.static:
            face_det_results = face_detect(frames) # BGR2RGB for CNN face detection
        else:
            face_det_results = face_detect([frames[0]])
    else:
        print('Using the specified bounding box instead of face detection...')
        y1, y2, x1, x2 = args.box
        face_det_results = [[f[y1: y2, x1:x2], (y1, y2, x1, x2)] for f in frames]

    for i, m in enumerate(mels):
        idx = 0 if args.static else i%len(frames)
        frame_to_save = frames[idx].copy()
        face, coords = face_det_results[idx].copy()

        face = cv2.resize(face, (args.img_size, args.img_size))

        img_batch.append(face)
        mel_batch.append(m)
        frame_batch.append(frame_to_save)
        coords_batch.append(coords)

        if len(img_batch) >= args.wav2lip_batch_size:
            img_batch, mel_batch = np.asarray(img_batch), np.asarray(mel_batch)

            img_masked = img_batch.copy()
            img_masked[:, args.img_size//2:] = 0

            img_batch = np.concatenate((img_masked, img_batch), axis=3) / 255.
            mel_batch = np.reshape(mel_batch, [len(mel_batch), mel_batch.shape[1], mel_batch.shape[2], 1])

            yield img_batch, mel_batch, frame_batch, coords_batch
            img_batch, mel_batch, frame_batch, coords_batch = [], [], [], []

    if len(img_batch) > 0:
        img_batch, mel_batch = np.asarray(img_batch), np.asarray(mel_batch)

        img_masked = img_batch.copy()
        img_masked[:, args.img_size//2:] = 0

        img_batch = np.concatenate((img_masked, img_batch), axis=3) / 255.
        mel_batch = np.reshape(mel_batch, [len(mel_batch), mel_batch.shape[1], mel_batch.shape[2], 1])

        yield img_batch, mel_batch, frame_batch, coords_batch

def main():
    args.img_size = 96

    if os.path.isfile(args.face) and args.face.split('.')[1] in ['jpg', 'png', 'jpeg']:
        args.static = True

    if not os.path.isfile(args.face):
        raise ValueError('--face argument must be a valid path to video/image file')

    elif args.face.split('.')[1] in ['jpg', 'png', 'jpeg']:
        full_frames = [cv2.imread(args.face)]
        fps = args.fps

    else:
        video_stream = cv2.VideoCapture(args.face)
        fps = video_stream.get(cv2.CAP_PROP_FPS)

        print('Reading video frames...')

        full_frames = []
        while 1:
            still_reading, frame = video_stream.read()
            if not still_reading:
                video_stream.release()
                break

            aspect_ratio = frame.shape[1] / frame.shape[0]
            frame = cv2.resize(frame, (int(args.out_height * aspect_ratio), args.out_height))

            if args.rotate:
                frame = cv2.rotate(frame, cv2.cv2.ROTATE_90_CLOCKWISE)

            y1, y2, x1, x2 = args.crop
            if x2 == -1: x2 = frame.shape[1]
            if y2 == -1: y2 = frame.shape[0]

            frame = frame[y1:y2, x1:x2]

            full_frames.append(frame)

    print ("Number of frames available for inference: "+str(len(full_frames)))

    if not args.audio.endswith('.wav'):
        print('Extracting raw audio...')
        subprocess.check_call([
            "ffmpeg", "-y",
            "-i", args.audio,
            "temp/temp.wav",
        ])
        args.audio = 'temp/temp.wav'

    wav = audio.load_wav(args.audio, 16000)
    mel = audio.melspectrogram(wav)
    print(mel.shape)

    if np.isnan(mel.reshape(-1)).sum() > 0:
        raise ValueError('Mel contains nan! Using a TTS voice? Add a small epsilon noise to the wav file and try again')

    mel_chunks = []
    mel_idx_multiplier = 80./fps
    i = 0
    while 1:
        start_idx = int(i * mel_idx_multiplier)
        if start_idx + mel_step_size > len(mel[0]):
            mel_chunks.append(mel[:, len(mel[0]) - mel_step_size:])
            break
        mel_chunks.append(mel[:, start_idx : start_idx + mel_step_size])
        i += 1

    print("Length of mel chunks: {}".format(len(mel_chunks)))

    full_frames = full_frames[:len(mel_chunks)]

    batch_size = args.wav2lip_batch_size
    gen = datagen(full_frames.copy(), mel_chunks)

    s = time()

    # Load model once
    model = load_model(args.checkpoint_path)

    for i, (img_batch, mel_batch, frames, coords) in enumerate(tqdm(gen,
                                            total=int(np.ceil(float(len(mel_chunks))/batch_size)))):
        if i == 0:
            frame_h, frame_w = full_frames[0].shape[:-1]
            out = cv2.VideoWriter('temp/result.avi',
                                    cv2.VideoWriter_fourcc(*'DIVX'), fps, (frame_w, frame_h))

        # Convert to tensor with optimization
        img_batch = torch.FloatTensor(np.transpose(img_batch, (0, 3, 1, 2))).to(device)
        mel_batch = torch.FloatTensor(np.transpose(mel_batch, (0, 3, 1, 2))).to(device)
        
        # Use half precision if enabled
        if args.use_mixed_precision and device == 'cuda':
            img_batch = img_batch.half()
            mel_batch = mel_batch.half()

        with torch.no_grad():
            pred = model(mel_batch, img_batch)

        # Convert back to full precision for numpy operations
        if args.use_mixed_precision and device == 'cuda':
            pred = pred.float()
            
        pred = pred.cpu().numpy().transpose(0, 2, 3, 1) * 255.

        for p, f, c in zip(pred, frames, coords):
            y1, y2, x1, x2 = c
            p = cv2.resize(p.astype(np.uint8), (x2 - x1, y2 - y1))

            f[y1:y2, x1:x2] = p
            out.write(f)

    out.release()

    print("wav2lip prediction time:", time() - s)

    subprocess.check_call([
        "ffmpeg", "-y",
        "-i", "temp/result.avi",
        "-i", args.audio,
        args.outfile,
    ])

if __name__ == '__main__':
    main() 