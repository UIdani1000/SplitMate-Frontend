# app.py
from flask import Flask, request, jsonify, render_template, redirect, url_for
from flask_cors import CORS
import os

# Set the template folder to be 'templates' inside the current directory
# NOTE: If your HTML files are in the SAME directory as app.py, you should use template_folder='.'
# If they are in a folder named 'templates', the current setup is fine.
app = Flask(__name__, template_folder='templates') 
CORS(app)

# --- API LOGIC ---

def calculate_split_equal(total_bill, names):
    """Calculates the equal split among a list of people."""
    if not names:
        return 0, {}

    num_people = len(names)
    amount_per_person = total_bill / num_people
    results = {name: round(amount_per_person, 2) for name in names}
    return num_people, results

@app.route('/api/split', methods=['POST'])
def split_bill_api():
    """API endpoint to receive JSON data and return split calculation."""
    if not request.is_json:
        return jsonify({"error": "Missing JSON in request"}), 400
    data = request.get_json()
    
    try:
        total_bill = float(data.get('total'))
        names = data.get('names')
    except (TypeError, ValueError):
        return jsonify({"error": "Invalid input for 'total' or 'names'"}), 400

    if not isinstance(names, list) or total_bill <= 0:
        return jsonify({"error": "Total must be positive and names must be a list"}), 400
    
    num_people, results = calculate_split_equal(total_bill, names)
    
    return jsonify({
        "success": True,
        "total_bill": total_bill,
        "num_people": num_people,
        "split_amounts": results
    })

# --- UI ROUTING ---

@app.route('/')
def home():
    # This route should work
    return render_template('index.html') 

@app.route('/index')
def index_view():
    # This route should be looking for templates/index.html
    return render_template('index.html')

@app.route('/create')
def create_view():
    # This route works, meaning create.html is found correctly
    return render_template('create.html')

@app.route('/leaderboard')
def leaderboard_view():
    # This route should be looking for templates/leaderboard.html
    return render_template('leaderboard.html')


if __name__ == '__main__':
    # Flask runs on http://127.0.0.1:5000/
    app.run(debug=True)