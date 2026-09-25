# Infrastructure Diagram

## 1. Cloud Infrastructure (Conceptual)

This diagram represents the recommended production infrastructure on a cloud provider (e.g., GCP/AWS), moving away from a single VM setup.

```mermaid
graph TD
    Client[Client Browser / Mobile] -->|HTTPS| LB[Load Balancer]
    
    subgraph "Private Network (VPC)"
        LB -->|Traffic| AppCluster["App Cluster (K8s / Cloud Run)"]
        
        subgraph "App Cluster"
            API[NestJS API Replicas]
            Worker["Worker Service (Future)"]
        end
        
        API -->|Read/Write| DB_Primary[(MySQL Primary)]
        API -.->|Read Only| DB_Replica[(MySQL Replica)]
        
        API -->|Cache| Redis[(Redis Cache)]
    end
    
    API -->|Store Files| ObjectStore["Cloud Storage (S3 / GCS)"]
    API -->|Send SMS| SMS_Gateway[External SMS Provider]
```

## 2. Current Deployment (VM Based)

As per `docs/deployment/VM-deploy.md`, the current setup is likely:

- **Single VM (e.g., EC2 / Compute Engine)**
  - Docker Compose running:
    - `backend` container
    - `frontend` container
    - `nginx` (Reverse Proxy)
  - **Database:** Managed SQL or containerized MySQL (Not recommended for Prod).

## 3. Network Security
- **Firewall Rules:**
  - Inbound: Allow 80/443 (HTTP/HTTPS) from Load Balancer/Public.
  - Outbound: Allow traffic to SMS Gateway and Cloud Storage.
  - Internal: Database only accepts connections from App Cluster.
