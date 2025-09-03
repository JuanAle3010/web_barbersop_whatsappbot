💈 BarberShop Web + WhatsApp Bot
Welcome to the BarberShop Web + WhatsApp Bot project — a full-stack solution designed for local barbershops to manage appointments through a modern website and automated WhatsApp messaging. This project demonstrates my ability to build real-world applications using web technologies, APIs, and automation tools.

🚀 Live Preview
If GitHub Pages is enabled, you can preview the frontend here: https://juanale3010.github.io/web_barbersop_whatsappbot/frontend/

🧪 Technologies Used
Frontend: HTML, CSS, JavaScript

Backend: Python, FastAPI, Uvicorn

API Design: RESTful architecture

Automation: WhatsApp messaging via pywhatkit

Data Handling: JSON for appointments and configuration

Version Control: Git & GitHub

🛠️ How to Run Locally
Follow these steps to run the project on your local machine:

1. Clone the repository
bash
git clone https://github.com/JuanAle3010/web_barbersop_whatsappbot.git
cd web_barbersop_whatsappbot
2. Install dependencies
Make sure you have Python 3.9+ installed. Then install the required packages:

bash
pip install fastapi uvicorn pywhatkit
You may also need additional packages depending on your system (e.g. pydantic, requests, etc.)

3. Run the backend server
Start the FastAPI server using Uvicorn:

bash
python -m uvicorn backend.main:app --reload
This will launch the API at http://127.0.0.1:8000. You can visit http://127.0.0.1:8000/docs to explore the interactive Swagger UI and test endpoints.

4. Open the frontend
Navigate to the frontend folder and open index.html in your browser:

bash
cd frontend
# Open index.html manually or with a live server
📦 Project Structure
Código
web_barbersop_whatsappbot/
├── backend/         # FastAPI backend with WhatsApp bot logic
│   └── main.py
├── frontend/        # Static website for the barbershop
│   └── index.html
├── citas.json       # Appointment data
├── config.json      # Bot configuration
├── README.md        # Project documentation
🤖 WhatsApp Bot Features
Automatically sends appointment confirmations via WhatsApp

Reads and writes appointment data from citas.json

Configurable working hours and message templates via config.json

Built with pywhatkit for message automation

🎯 Purpose & Learning Outcomes
This project is part of my personal portfolio and reflects the following skills:

Building full-stack applications from scratch

Designing and consuming RESTful APIs

Automating real-world tasks using Python

Structuring scalable and maintainable codebases

Using Git and GitHub for collaboration and deployment

📬 Contact
Feel free to reach out if you'd like to collaborate, give feedback, or learn more about the project.
Juan Alejandro Romero Bejaran
GitHub: @JuanAle3010
Email: juanalejandro.romero@alu.uhu.es
