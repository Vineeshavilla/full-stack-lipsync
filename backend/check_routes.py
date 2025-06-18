from main import app

print("Available routes:")
for route in app.routes:
    if hasattr(route, 'methods') and hasattr(route, 'path'):
        print(f"{route.methods} {route.path}")
    elif hasattr(route, 'routes'):
        print(f"Router with {len(route.routes)} routes")
        for subroute in route.routes:
            if hasattr(subroute, 'methods') and hasattr(subroute, 'path'):
                print(f"  {subroute.methods} {subroute.path}") 