# ============================================================
#  SplitMate - Flask Backend
#  Decentralized Bill Splitting Platform
# ============================================================

from flask import Flask, request, jsonify, render_template, redirect, url_for
from flask_cors import CORS
import os


# ============================================================
#  APP CONFIGURATION
# ============================================================

app = Flask(
    __name__,
    template_folder='templates',   # Folder where all HTML templates live
    static_folder='static'         # Folder for CSS, JS, Images
)

# Enable CORS for API requests
CORS(app)


# ============================================================
#  API LOGIC
# ============================================================

def calculate_split_equal(total_bill, names):
    """
    Calculates an equal split among participants.
    Returns the number of people and a dict of name → amount.
    """
    if not names:
        return 0, {}

    num_people = len(names)
    amount_per_person = total_bill / num_people
    results = {name: round(amount_per_person, 2) for name in names}

    return num_people, results


@app.route('/api/split', methods=['POST'])
def split_bill_api():
    """
    Example REST endpoint for quick bill-split testing (JSON).
    Body: { "total": 100, "names": ["Alice", "Bob"] }
    """
    if not request.is_json:
        return jsonify({"error": "Missing JSON in request"}), 400

    data = request.get_json(silent=True) or {}

    try:
        total_bill = float(data.get('total', 0))
        names = data.get('names', [])
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


# ============================================================
#  UI ROUTES
# ============================================================

@app.route('/')
def home():
    """Landing page → index.html"""
    return render_template('index.html')


@app.route('/index')
def index_view():
    """Alias route for index.html"""
    return render_template('index.html')


@app.route('/create')
def create_view():
    """Create new bill UI (optional page)"""
    return render_template('create.html')


@app.route('/leaderboard')
def leaderboard_view():
    """Leaderboard UI (optional page)"""
    return render_template('leaderboard.html')


@app.route('/style')
def style_view():
    """Component style guide page"""
    return render_template('style.html')


@app.route('/healthz')
def health_check():
    """Simple health endpoint for debugging"""
    return jsonify({"status": "ok"})


# ============================================================
#  DEV HELPERS
# ============================================================

@app.after_request
def add_no_cache_headers(response):
    """Prevents caching during development for static files."""
    if app.debug:
        response.headers['Cache-Control'] = 'no-store'
    return response


# ============================================================
#  MAIN ENTRY POINT
# ============================================================

if __name__ == '__main__':
    """
    Run the local Flask server.
    Default: http://127.0.0.1:5000/
    To test externally (LAN): app.run(host='0.0.0.0', port=5000, debug=True)
    """
    app.run(debug=True)
