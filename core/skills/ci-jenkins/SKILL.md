---
name: ci-jenkins
description: Pipelines CI/CD con Jenkins (Jenkinsfile declarativo, agentes Docker/Kubernetes, credenciales, shared libraries, aprobaciones con input, multibranch). Usar al crear o modificar un Jenkinsfile o shared libraries.
---
# Jenkins

Aplica los principios de `devops-cicd`.

## Jenkinsfile declarativo
```groovy
pipeline {
  agent { kubernetes { yamlFile 'ci/pod.yaml' } }   // o docker { image 'node:22' }
  options { timeout(time: 30, unit: 'MINUTES'); timestamps(); disableConcurrentBuilds(); buildDiscarder(logRotator(numToKeepStr: '20')) }
  environment { REGISTRY = 'registro.institucion.cl' }
  stages {
    stage('Instalar') { steps { sh 'npm ci' } }
    stage('Lint y tests') { parallel {
      stage('Lint')  { steps { sh 'npm run lint' } }
      stage('Tests') { steps { sh 'npm test -- --ci --reporters=default --reporters=jest-junit' } }
    } }
    stage('Build') { steps { sh 'npm run build' } }
    stage('Deploy prod') {
      when { branch 'main' }
      input { message '¿Desplegar a producción?'; submitter 'equipo-despliegue' }
      steps { sh './ci/deploy.sh prod' }
    }
  }
  post { always { junit 'reports/**/*.xml' } }
}
```
(Ajustar a la estructura real del proyecto.)

## Reglas
- Declarativo sobre scripted; lógica compleja en **shared libraries** (`@Library('lib@v1') _`) versionadas.
- Credenciales con `credentials()` / `withCredentials` (nunca en texto plano ni `echo`).
- Agentes efímeros (Docker/Kubernetes) con imágenes fijadas; nada de herramientas instaladas a mano en el controlador.
- `when { branch / tag / changeRequest }` para controlar etapas; `input` con `submitter` para producción.
- Multibranch pipelines para PRs; `post` para reportes y limpieza.

## Validación
Linter de Jenkinsfile (`/pipeline-model-converter/validate` del servidor o plugin del IDE) antes de proponer.
