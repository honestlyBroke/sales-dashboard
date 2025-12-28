# Executive Sales Dashboard (2015-2017)

A responsive, interactive data visualization dashboard built with HTML, CSS, and JavaScript. This project analyzes sales data to track KPIs, regional performance, and product trends over a three-year period.

## 🚀 Features

* **Interactive Charts:** Visualization of sales trends, category splits, and profitability using **Chart.js**.
* **Dynamic Filtering:** Filter data by Year, Region, and Segment.
* **Advanced Controls:** Range sliders for Sales amount, Quantity, and Discount levels.
* **Theme Toggle:** Switch between a professional Blue (Light) theme and a Purple (Dark) theme.
* **Robust Data Parsing:** Handles CSV data import using **PapaParse**, with logic to handle inconsistent date formats (ISO vs. Standard).
* **Responsive Design:** optimized for various screen sizes.

## 🛠️ Technologies Used

* **HTML5 & CSS3** (Custom Grid Layout)
* **JavaScript (ES6+)**
* **[Chart.js](https://www.chartjs.org/)** - For data visualization.
* **[PapaParse](https://www.papaparse.com/)** - For fast CSV parsing.

## 📂 Project Structure

```text
├── data/
│   ├── sales_2015.csv
│   ├── sales_2016.csv
│   └── sales_2017.csv
├── index.html       (Main dashboard file)
├── style.css        (Styling and theming)
├── script.js        (Logic, data parsing, and chart rendering)
└── README.md

```

## 🔧 How to Run Locally

Because this project uses the `fetch()` API to load external CSV files, browser security policies (CORS) prevent it from running directly by just double-clicking `dashboard.html`. You must run it through a local server.

### Option 1: VS Code (Recommended)

1. Install the **Live Server** extension.
2. Open `dashboard.html`.
3. Right-click and select **"Open with Live Server"**.

### Option 2: Python

If you have Python installed, open your terminal in the project folder and run:

```bash
# Python 3
python -m http.server 8000

```

Then open `http://localhost:8000/dashboard.html` in your browser.

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
