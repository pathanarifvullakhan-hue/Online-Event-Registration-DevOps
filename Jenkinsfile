pipeline {
    agent any

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Build Test Image') {
            steps {
                sh 'docker build -f Dockerfile.test -t online-event-registration-test:${BUILD_NUMBER} .'
            }
        }

        stage('Unit Tests') {
            steps {
                sh 'docker run --rm online-event-registration-test:${BUILD_NUMBER} npm test'
            }
        }

        stage('Build Docker Image') {
            steps {
                sh 'docker build -t online-event-registration:${BUILD_NUMBER} .'
            }
        }

        stage('Run Application') {
            steps {
                sh 'docker rm -f event-registration-jenkins || true'
                sh 'docker run -d --name event-registration-jenkins -e PORT=3000 online-event-registration:${BUILD_NUMBER}'
                sh 'sleep 10'
                sh '''docker exec event-registration-jenkins node -e "fetch('http://localhost:3000').then(r => { console.log('HTTP STATUS:', r.status); process.exit(r.ok ? 0 : 1) }).catch(e => { console.error(e); process.exit(1) })"'''
            }
        }
    }

    post {
        always {
            sh 'docker rm -f event-registration-jenkins || true'
            archiveArtifacts artifacts: 'test-results/**', allowEmptyArchive: true
        }
    }
}