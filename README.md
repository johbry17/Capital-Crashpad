# Capital Crashpad: Visualizing the Airbnb Market in Washington, DC

![GitHub last commit](https://img.shields.io/github/last-commit/johbry17/Capital-Crashpad)

*Explore, visualize, and understand DC’s Airbnb landscape—interactive dashboards and maps powered by open data and modern web tech.*

🔗 [Live Website](https://johbry17.github.io/Capital-Crashpad/)  
🔗 [Tableau Dashboard](https://public.tableau.com/app/profile/bryan.johns6699/viz/DC-Airbnb/DCAirbnbMobile)  
🔗 [Exploratory Data Analysis (EDA)](/exploratory_data_analysis/eda.ipynb)

> ⚠️ ℹ️ Status: This project is under active, rapid refinement. Adding a summary analysis and updating the dashboard for the GitHub Pages version.

<!-- This project is maintained as a portfolio example. While not under active development, data and dashboards are refreshed semiannually as new information becomes available. -->

## Table of Contents

- [Project Overview](#project-overview)
- [Features](#features)
- [Tools & Technologies](#tools--technologies)
- [Usage](#usage)
- [Gallery](#gallery)
- [References](#references)
- [License](#license)
- [Acknowledgements](#acknowledgements)
- [Author](#author)

## Project Overview

This full-stack project explores the landscape of short-term rentals in Washington, DC. Using data from Inside AirBnB, it combines:

- A **live, interactive web dashboard** hosted on GitHub Pages
- A **Tableau story-style EDA** for strategic analysis
- A **PostgreSQL backend** with Flask and Django implementations
- A **Jupyter-based ETL pipeline** that transforms and loads data for multiple outputs

The goal is to visualize the availability, pricing, and neighborhood distribution of short-term rentals and highlight interesting patterns in the DC vacation rental market.

## Features

- Dynamic map with multiple layers and neighborhood overlays
- Interactive plots aggregating neighborhood trends
- Tableau dashboard for filtering and exploring rental trends
- Clean ETL pipeline to prep and load data across platforms
- Choropleth and bubble maps to compare neighborhoods
- Flask and Django versions for backend experimentation
- Mobile-friendly static version with JavaScript interactivity

## Tools & Technologies

- **Data**: Inside AirBnB, CSV, PostgreSQL, SQLite
- **Backend**: Flask, Django, SQL, Jupyter, Pandas
- **Frontend**: JavaScript, Plotly, Leaflet, Bootstrap, HTML/CSS
- **Visualization**: Tableau, Choropleths, Bubble Maps, Plotly
- **Deployment**: GitHub Pages, Tableau Public


## Usage

### Website
- [Visit GitHub Pages version](https://johbry17.github.io/Capital-Crashpad/) 
- Explore listings, prices, and availability
- Navigate through the embedded Tableau dashboard

### ETL Pipeline
- Edit and run `./notebooks/data_pipeline_postgres_export.ipynb` to clean and update source data
- Automatically loads PostgreSQL tables and exports data for Flask and GitHub Pages

### Full-Stack Versions
- Flask app: `flask/app.py` (pulls from PostgreSQL)
- Django app: `django/django_airbnb_dc` (uses SQLite)

### Data Backup
Restore the included PostgreSQL backup:
```bash
pg_restore -U <username> -d <dbname> -1 airbnb.backup
```


### Note to Self
- Run all cells in `./notebooks/data_pipeline_postgres_export.ipynb` to update the source data
- Recheck plotPriceAvailability annotations in `plots.js` after updates
- Review `schema.sql` and `neighbourhoods_dict` in `data_processing.ipynb`
- Export updated `map_listings` and `price_availability` views to CSV for GitHub Pages
- Leave Tableau as-is (June 2024)

### Errata
The Flask / Django version of the price-availability chart has formatting issues. Be sure to toggle the allDCData filter correctly in `plotPriceAvailability()`.

## Gallery

Tableau Dashboard:

![Tableau Plot](./resources/images/dc_airbnb_tableau_rental_type.png)

Web Dashboards Plots:

![Website Plot of Price and Availability, Upcoming Year](./resources/images/dc_airbnb_price_availability_plot.png)

![Minimum Nights Plot](./resources/images/minimum_nights_plots.png)

Interactive Map:

![Map](./resources/images/map.png)

![Map of Neighborhood](./resources/images/dc_airbnb_neighborhood.png)

![Neighborhood Map Color Coded by Rental Type](./resources/images/dc_airbnb_neighborhood_alt.png)

![Choropleth Map of Average Price per Neighborhood](./resources/images/choropleth.png)

![Bubble Map of Number of AirBnB's per Neighborhood](./resources/images/bubble.png)
Exploratory Data Analysis:

![Price Plot](./resources/images/dc_airbnb_price.png)

![Average Neighborhood Price Plot](./resources/images/dc_airbnb_avg_price.png)

Entity Relationship Diagram:

![ERD](./resources/images/ERD.png)

## Course Certificates

Parts of this project served as capstones for two of HarvardX’s free online computer science courses:  
- [CS50's Web Programming with Python and JavaScript](https://cs50.harvard.edu/web/2020/)
- [CS50's Introduction to Databases with SQL](https://cs50.harvard.edu/sql/2024/)

![cs50 Web Certificate](./resources/images/CS50W.png)

![cs50SQL Certificate](./resources/images/CS50SQL.png)

## References

Dataset provided by [Inside AirBnB](http://insideairbnb.com/about/).

Neighborhood population and housing unit data from [Census Reporter](https://censusreporter.org/).

## License

[Creative Commons Attribution 4.0 International License](http://creativecommons.org/licenses/by/4.0/)

## Acknowledgements

- Thanks to Imen Najar for early insights and support.
- Thanks to Geronimo Perez for feedback and assistance during development.

## Author

Bryan Johns, October 2024  
[bryan.johns@informedwanderer.com](mailto:bryan.johns@informedwanderer.com) | [LinkedIn](https://www.linkedin.com/in/b-johns/) | [GitHub](https://github.com/johbry17) | [Portfolio](https://informedwanderer.com)  
— Fluent in Data. Fluent in Human.

