from flask import Flask, render_template, jsonify
from sqlalchemy import create_engine, text
import config

# connect to database
DATABASE_URL = (
    f"postgresql://postgres:{config.password}@localhost:5432/{config.database}"
)
engine = create_engine(DATABASE_URL)

app = Flask(__name__, template_folder="templates/")


# connects and queries database
def fetch(query):
    with engine.connect() as connection:
        with connection.begin():
            result = connection.execute(query)
            column_names = result.keys()
        return [dict(zip(column_names, row)) for row in result]


# html route
@app.route("/")
def home():
    return render_template("index.html")


# app routes
@app.route("/api/listings")
def get_listings():
    # some have nulls, so LEFT JOIN
    #     query = text(f"""SELECT * FROM listings
    # LEFT JOIN listing_description ON listings.listing_id = listing_description.id
    # LEFT JOIN listing_reviews ON listings.listing_id = listing_reviews.listing_id
    # LEFT JOIN hosts ON hosts.host_id = listings.host_id""")
    query = text(f"SELECT * FROM map_listings")
    return jsonify(fetch(query))


@app.route("/api/price_availability")
def get_price_availability():
    query = text(f"SELECT * FROM price_availability")
    return jsonify(fetch(query))


@app.route("/api/scrape_date")
def get_scrape_date():
    query = text(f"SELECT * FROM metadata")
    return jsonify(fetch(query))


if __name__ == "__main__":
    app.run()
