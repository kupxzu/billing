<!DOCTYPE html>
<html>
<head>
    <title>API Documentation</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="shortcut icon" href="{{ asset('./AceLogo.png') }}">

    <style>
        body { background-color: #f8f9fa; }
        .swagger-header { background-color: #1b1b1b; color: white; padding: 20px 0; }
        .endpoint { border: 1px solid #dee2e6; border-radius: 4px; margin-bottom: 10px; }
        .endpoint-header { padding: 10px; cursor: pointer; }
        .get { background-color: #61affe; color: white; }
        .post { background-color: #49cc90; color: white; }
        .put { background-color: #fca130; color: white; }
        .delete { background-color: #f93e3e; color: white; }
        .method-badge {
            padding: 5px 10px;
            border-radius: 3px;
            font-weight: bold;
            width: 80px;
            display: inline-block;
            text-align: center;
        }
        .endpoint-content { padding: 15px; background-color: white; }
        .uri-path { font-family: monospace; margin-left: 15px; }
    </style>
</head>
<body>
    <div class="swagger-header">
        <div class="container">
            <h1>API Documentation</h1>
            <p>Documentation for available API endpoints</p>
        </div>
    </div>

    <div class="container mt-4">
        @php
            $routeCollection = collect($routes->getRoutes());
            $groupedRoutes = $routeCollection->groupBy(function ($route) {
                $uri = $route->uri();
                return explode('/', $uri)[0] === '' ? 'root' : explode('/', $uri)[0];
            });
        @endphp

        @foreach($groupedRoutes as $group => $routes)
            <div class="mb-4">
                <h3 class="mb-3">{{ ucfirst($group) }} Endpoints</h3>
                @foreach($routes as $route)
                    <div class="endpoint">
                        <div class="endpoint-header">
                            @foreach($route->methods() as $method)
                                @if($method !== 'HEAD')
                                    <span class="method-badge {{ strtolower($method) }}">
                                        {{ $method }}
                                    </span>
                                @endif
                            @endforeach
                            <span class="uri-path">{{ $route->uri() }}</span>
                        </div>
                        <div class="endpoint-content">
                            <div class="row">
                                <div class="col-md-3">
                                    <strong>Route Name:</strong>
                                </div>
                                <div class="col-md-9">
                                    {{ $route->getName() ?: 'Unnamed' }}
                                </div>
                            </div>
                            <div class="row mt-2">
                                <div class="col-md-3">
                                    <strong>Controller Action:</strong>
                                </div>
                                <div class="col-md-9">
                                    {{ $route->getActionName() }}
                                </div>
                            </div>
                        </div>
                    </div>
                @endforeach
            </div>
        @endforeach
    </div>

    <script>
        document.querySelectorAll('.endpoint-header').forEach(header => {
            header.addEventListener('click', () => {
                const content = header.nextElementSibling;
                content.style.display = content.style.display === 'none' ? 'block' : 'none';
            });
        });
    </script>
</body>
</html>
