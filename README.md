# Online Event Registration and Management System

A student event portal with registration/login, event listing, event registration, participant view, admin dashboard and confirmation messages. Built with Node.js, Express, SQLite, Docker, Jenkins and Selenium.

## Demo accounts
- Admin email: `admin@event.com`
- Admin password: `Admin@123`
- Register a normal student account from the home page.

Change the demo admin password and session secret before any real deployment. This is a learning/demo project.

## 1. Run locally on macOS
1. Install Node.js 20 or newer and Git.
2. Open Terminal and move into this folder:
   `cd ~/Downloads/OnlineEventRegistrationDevOps`
3. Install dependencies:
   `npm install`
4. Start:
   `npm start`
5. Open `http://localhost:3000`.

The SQLite database is created automatically at `data/events.db`. The `data` folder is ignored by Git; sample events and the admin account are seeded automatically when the database is first created.

## 2. Test locally
- Unit tests: `npm test`
- Selenium requires Google Chrome. Run `npm install` first, then `npm run test:e2e`.
- For the most consistent Selenium run, use the Docker Compose test setup below.

## 3. Upload source code to your GitHub
Create a new empty repository named `Online-Event-Registration-DevOps` in your own GitHub account. Do not add a README/license from GitHub if you already have these files.
```bash
git init
git add .
git commit -m "Initial Online Event Registration project"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/Online-Event-Registration-DevOps.git
git push -u origin main
```
Replace `YOUR-USERNAME` with your GitHub username. If Git asks you to authenticate, use the browser sign-in flow or a GitHub personal access token; never put a password/token in source code.

## 4. Build and run with Docker
Make sure Docker Desktop is open.
```bash
docker build -t online-event-registration:1.0 .
docker run -d --name event-registration-app -p 3000:3000 -v event_data:/app/data online-event-registration:1.0
docker ps
```
Open `http://localhost:3000`. Stop/remove:
```bash
docker stop event-registration-app
docker rm event-registration-app
```

Or use Compose:
```bash
docker compose up -d --build app
docker compose ps
docker compose logs -f app
```
Open `http://localhost:3000`. Stop:
```bash
docker compose down
```
The named `event_data` volume keeps the database when the app container is recreated. `docker compose down -v` deletes that data.

## 5. Selenium browser tests using Docker
With Docker Desktop running, from the project folder:
```bash
docker compose --profile test up --build --abort-on-container-exit --exit-code-from e2e selenium e2e
```
This starts the application, Selenium Chrome and the automated browser test. Look for `TC01 PASS`, `TC02 PASS`, `TC08 PASS` and `TC09 PASS`. Then clean up:
```bash
docker compose --profile test down
```

## 6. Jenkins setup (same workflow as the Attendance DevOps project)
1. Start Jenkins using your existing local Jenkins setup and open `http://localhost:8080`.
2. Ensure the Jenkins machine/agent can run Docker commands and has the Docker CLI plus Docker Compose plugin. If Jenkins runs inside a container, it must have access to the host Docker socket and compatible Docker CLI/Compose plugin.
3. In Jenkins, choose **New Item** → enter `Online-Event-Registration-Pipeline` → **Pipeline** → OK.
4. Under **Pipeline**, choose **Pipeline script from SCM**.
5. SCM: **Git**. Repository URL: `https://github.com/YOUR-USERNAME/Online-Event-Registration-DevOps.git`. Branch: `*/main`. Script Path: `Jenkinsfile`.
6. Save, then choose **Build Now**. Open **Console Output** to follow Checkout, Install Dependencies, Unit Tests, Docker Image Build, Run Application and Selenium Tests.
7. The app is available at `http://localhost:3000` on the Docker host.

If port 3000 is already occupied, stop the other app using it before this pipeline, or change the host port in `docker-compose.yml` and update the Jenkins health-check URL.

## 7. Test case mapping
| Test ID | Test case | Expected result |
|---|---|---|
| TC01 | Open registration page | Page should load |
| TC02 | Register with valid details | Registration successful |
| TC03 | Submit empty form | Browser required-field validation |
| TC04 | Enter invalid email | Browser/email validation message |
| TC05 | Register with duplicate email | Duplicate registration prevented |
| TC06 | Login with valid credentials | Dashboard/navigation displayed |
| TC07 | View registered events | Correct events displayed |
| TC08 | Register for an event | Registration confirmation displayed |
| TC09 | View My Registrations | Registered event displayed |
| TC10 | Admin views participants | Participant list displayed |
| TC11 | Student opens admin endpoint | Access denied |
| TC12 | Register for same event twice | Duplicate registration prevented |

The Selenium script automates the main happy path (TC01, TC02, TC08, TC09). Unit tests check basic validation rules. The other cases can be verified manually through the UI/API.

## 8. Useful commands
```bash
# Check app
curl http://localhost:3000/health

# Docker status/logs
docker ps
docker logs event-registration-app

# Compose status/logs
docker compose ps
docker compose logs app

# Git status and upload later changes
git status
git add .
git commit -m "Update event registration project"
git push
```
