import flask
from flask import request
from elasticsearch import Elasticsearch
import json


app = flask.Flask(__name__)

@app.route('/')
def index():
    flask.abort(400)

@app.route('/api/')
def api():
    return "<span style='color:red'>I am app 1 API</span>"

@app.route('/api/query')
def query():
    values = request.args.get('values', "avg_temperature").split(',')
    time_begin = request.args.get('begin', 'now-5d')
    time_end = request.args.get('end', 'now')
    interval = request.args.get('interval', '30m')
    return json.dumps(data_query(time_begin=time_begin, time_end=time_end, interval=interval, values=values))


def data_query(time_begin="now-5d", time_end="now", interval="30m", values=["avg_temperature"]):
    es = Elasticsearch([{'host': 'es01', 'port': 9200}])
    res = es.search(
        index="observations",
        body={
            "query": {
                "bool": { 
                    "filter": [
                        { 
                            "range": { 
                                "timestamp": { 
                                    "gte": time_begin,  # "now-5d",
                                    "lte": time_end,  # "now"
                                },
                            },
                        },
                    ], 
                }, 
            },
            "size": 0, 
            "aggregations": { 
                "sensors": { 
                    "terms": { 
                        "field": "name.keyword", 
                    },
                    "aggregations": { 
                        "per_interval": { 
                            "date_histogram": { 
                                "field": "timestamp", 
                                "fixed_interval": interval
                            },
                            "aggregations": {
                                k: {k.split("_")[0]: {"field": k.split("_")[1]}} for k in values
                            }
                        } 
                    }
                }
            },
        })

    results = {}
    for sensor in res['aggregations']['sensors']['buckets']:
        sensor_name = sensor['key']
        for obs in sensor['per_interval']['buckets']:
            timestamp = obs['key']
            time_bucket = results.get(timestamp, {})

            time_bucket[sensor_name] = {
                k: obs[k]['value'] for k in values
            }
            results[timestamp] = time_bucket

    return results