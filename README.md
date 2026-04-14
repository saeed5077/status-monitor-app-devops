# StatusMonitor: Jenkins CI/CD & Ephemeral Infrastructure 🚀
## 🏗 Architecture Overview

<p align="center">
  <a href="./statusmonitor-architecture.png">
    <img src="./statusmonitor-architecture.png" alt="StatusMonitor Architecture" width="900"/>
  </a>
  <br/>
  <em>Cloud-native CI/CD pipeline with Jenkins, Terraform, GKE, and dynamic staging environments</em>
</p>

A highly available, cloud-native status monitoring application deployed via a robust CI/CD pipeline. This project features automated security scanning, ephemeral staging environments, and on-the-fly SSL generation for service whitelabeling.

## 🏗 Architecture & Tech Stack

* **Application Server:** StatusMonitor application
* **Database:** Neon DB (Serverless PostgreSQL)
* **Caching:** Redis
* **Reverse Proxy:** Caddy (Handles on-the-fly SSL generation for whitelabeling)
* **Container Orchestration:** Google Kubernetes Engine (GKE)
* **Deployment:** Helm
* **Monitoring & Observability:** Prometheus & Grafana (kube-prometheus-stack)

## ⚙️ CI/CD Pipeline

The core deployment lifecycle is managed by **Jenkins**, utilizing a custom **Jenkins Shared Library** to standardize DevOps operations and Helm chart deployments.

1.  **Code Commit:** Code is pushed to the repository.
2.  **Security & Static Analysis:** Jenkins triggers **SonarQube** to scan the codebase for vulnerabilities and hardcoded secrets. 
3.  **Quality Gates:** The build only proceeds if the SonarQube Quality Gates are passed successfully.
4.  **Build & Push:** A Docker image is built and pushed to **Google Artifact Registry (GAR)**.
5.  **Deploy:** The application is deployed to the target GKE cluster using **Helm**.

## 🌱 Ephemeral Staging Environments (GitOps)

To optimize cloud costs and ensure isolated testing, the `Stage` environment is completely dynamic and ephemeral, orchestrated via **GitHub Actions** and **Terraform**.

* **Trigger:** When a Pull Request (PR) is opened against the `stage` branch.
* **Provisioning:** A GitHub Workflow triggers Terraform to provision the required GKE infrastructure from scratch.
* **Deployment:** Once the infrastructure is ready, the workflow triggers the standard Jenkins pipeline to deploy the application to the newly created cluster.
* **Tear Down:** Upon merging or closing the PR, a cleanup workflow executes a Terraform destroy command, completely removing the staging infrastructure to save costs.

## 📂 Related Repositories

This project follows a modular approach, separating application code from infrastructure and pipeline logic. 

* **Infrastructure as Code (IaC):** [Terraform Infrastructure Repository](https://github.com/saeed5077/Terraform-IaaC)
* **Pipeline & Deployment:** [DevOps & Jenkins Shared Library Repository](https://github.com/saeed5077/DevOps)

## 📊 Monitoring

The infrastructure and application health are monitored using the **kube-prometheus-stack**. 
* **Prometheus** scrapes metrics from the Kubernetes nodes, pods, and application endpoints.
* **Grafana** provides visualized dashboards for real-time monitoring of resource utilization, response times, and application uptime.

## 🔒 Security & SSL

* **Whitelabeling:** Using **Caddy** as a reverse proxy allows the application to serve multiple custom domains dynamically, with Caddy automatically provisioning and renewing Let's Encrypt SSL certificates on the fly.
* **Secret Management:** No secrets are hardcoded. SonarQube strictly enforces this during the CI process.
##Test-change