import http.server
import socketserver
import os
import urllib.parse

PORT = 8080

class MyHttpRequestHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        # Parse the URL path
        parsed_path = urllib.parse.urlparse(self.path)
        path = parsed_path.path
        
        # Serve static files
        if path.startswith('/static/'):
            self.path = path
            return http.server.SimpleHTTPRequestHandler.do_GET(self)
        
        # Default to serving chat.html
        elif path == '/' or path == '/chat':
            self.path = '/web_app/templates/chat.html'
            return http.server.SimpleHTTPRequestHandler.do_GET(self)
        
        # Serve other template files
        elif path.endswith('.html'):
            self.path = f'/web_app/templates{path}'
            return http.server.SimpleHTTPRequestHandler.do_GET(self)
        
        # Handle other paths
        else:
            return http.server.SimpleHTTPRequestHandler.do_GET(self)

handler = MyHttpRequestHandler
handler.extensions_map.update({
    '.css': 'text/css',
    '.js': 'application/javascript',
})

with socketserver.TCPServer(("", PORT), handler) as httpd:
    print(f"Serving at http://localhost:{PORT}")
    httpd.serve_forever()
