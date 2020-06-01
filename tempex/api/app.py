import flask

app = flask.Flask(__name__)

@app.route('/')
def index():
    flask.abort(400)

@app.route('/api/')
def api():
    return "<span style='color:red'>I am app 1 API</span>"
