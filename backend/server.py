import os
from flask import Flask, request, jsonify
import ml_service

app = Flask(__name__)

@app.route('/predict', methods=['POST'])
def predict():
    try:
        events = request.json
        if not events or not isinstance(events, list):
            return jsonify({"error": "Invalid input, expected list of events"}), 400

        val_A, val_B, val_C = None, None, None
        
        for e in events:
            src = str(e.get('source', '')).upper()
            if src in ['SOURCE_A', 'A']:
                val_A = e.get('value')
            elif src in ['SOURCE_B', 'B']:
                val_B = e.get('value')
            elif src in ['SOURCE_C', 'C']:
                val_C = e.get('value')

        # Run inference
        result = ml_service.predict(val_A, val_B, val_C)
        
        status = result['label']
        confidence = result['confidence']
        
        conflictingSources = []
        if status == 'conflicting':
            # ML model doesn't explicitly return which source is the outlier, 
            # so we quickly compute which one deviates most from the mean
            mean = result['features']['mean']
            
            deviations = []
            if val_A is not None: deviations.append(('SOURCE_A', abs(val_A - mean)))
            if val_B is not None: deviations.append(('SOURCE_B', abs(val_B - mean)))
            if val_C is not None: deviations.append(('SOURCE_C', abs(val_C - mean)))
            
            # Find the max deviation
            if deviations:
                max_dev_source = max(deviations, key=lambda x: x[1])
                conflictingSources.append(max_dev_source[0])
                
        response = {
            "status": status,
            "confidence": confidence,
            "anomalyScore": result['features'].get('max_deviation', 0),
            "reason": f"ML model returned {status} with {confidence*100}% confidence.",
            "conflictingSources": conflictingSources,
            "features": result['features']
        }
        
        return jsonify(response)
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    # Run on PORT env var if available, else 8000
    port = int(os.environ.get('PORT', 8000))
    app.run(host='0.0.0.0', port=port)
