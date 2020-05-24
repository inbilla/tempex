from flask import Flask

app = Flask(__name__)

@app.route('/')
def index():
    return "<span style='color:red'>I am app 1</span>"

@app.route('/api/')
def api():
    return "<span style='color:red'>I am app 1 API</span>"
