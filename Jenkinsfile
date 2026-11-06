pipeline {
    agent any
    stages {
        stage('Checkout') {
            steps { checkout scm }
        }
        stage('Install Dependencies') {
            steps {
                sh 'docker run --rm -v "$PWD:/app" -w /app node:20-bookworm-slim sh -c "npm install"'
            }
        }
        stage('Unit Tests') {
            steps {
                sh 'docker run --rm -v "$PWD:/app" -w /app node:20-bookworm-slim sh -c "npm install && npm test"'
            }
        }
        stage('Build Docker Image') {
            steps {
                sh 'docker build -t online-event-registration:${BUILD_NUMBER} .'
            }
        }
        stage('Run Application') {
            steps {
                sh 'docker compose up -d app'
                sh 'sleep 8'
                sh 'curl --fail http://localhost:3000/health'
            }
        }
        stage('Selenium Tests') {
            steps {
                sh 'docker compose --profile test up --abort-on-container-exit --exit-code-from e2e selenium e2e'
            }
        }
    }
    post {
        always {
            sh 'docker compose --profile test down || true'
            archiveArtifacts artifacts: 'test-results/**', allowEmptyArchive: true
        }
    }
}
