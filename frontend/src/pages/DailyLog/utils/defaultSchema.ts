import type { Schema } from './types';

const defaultSchema: Schema = {
  projects: ['Study', 'Weekeye'],
  categories: ['bug fix', 'feature', 'meeting', 'research', 'code review', 'devops', 'documentation', 'backend — api development', 'infrastructure', 'data pipeline', 'Fullstack'],
  projectInfos: {},
  technologies: [
    { name: 'Python', group: 'languages', subTechs: ['Flask', 'Django', 'FastAPI', 'Pandas', 'NumPy', 'SQLAlchemy', 'Celery', 'Pytest', 'Pydantic', 'BeautifulSoup', 'Pytesseract', 'Streamlit', 'NLTK'] },
    { name: 'JavaScript', group: 'languages', subTechs: ['React', 'Vue', 'Angular', 'Next.js', 'Express.js', 'Node.js', 'jQuery', 'D3.js', 'Webpack', 'Vite'] },
    { name: 'TypeScript', group: 'languages', subTechs: ['React', 'Angular', 'Next.js', 'NestJS', 'Zod', 'Prisma'] },
    { name: 'C#', group: 'languages', subTechs: ['.NET', 'ASP.NET', 'Entity Framework', 'Blazor', 'Unity', 'LINQ'] },
    { name: 'Java', group: 'languages', subTechs: ['Spring Boot', 'Hibernate', 'Maven', 'Gradle', 'JUnit', 'Kafka Client'] },
    { name: 'Go', group: 'languages', subTechs: ['Gin', 'Echo', 'GORM', 'Cobra'] },
    { name: 'Rust', group: 'languages', subTechs: ['Tokio', 'Actix', 'Serde', 'Diesel'] },
    { name: 'C++', group: 'languages', subTechs: ['Qt', 'Boost', 'CMake', 'OpenCV'] },
    { name: 'PHP', group: 'languages', subTechs: ['Laravel', 'Symfony', 'WordPress', 'Composer'] },
    { name: 'Ruby', group: 'languages', subTechs: ['Rails', 'Sinatra', 'RSpec', 'Sidekiq'] },
    { name: 'Swift', group: 'languages', subTechs: ['SwiftUI', 'UIKit', 'Combine', 'CoreData'] },
    { name: 'Kotlin', group: 'languages', subTechs: ['Ktor', 'Jetpack Compose', 'Coroutines', 'Room'] },
    { name: 'SQL', group: 'languages', subTechs: ['PostgreSQL', 'MySQL', 'SQLite', 'T-SQL', 'PL/pgSQL'] },
    { name: 'MongoDB', group: 'data_engineering', subTechs: ['Mongoose', 'Atlas', 'Aggregation Pipeline', 'Realm'] },
    { name: 'MySQL', group: 'data_engineering', subTechs: ['InnoDB', 'MySQL Workbench', 'Replication'] },
    { name: 'PostgreSQL', group: 'data_engineering', subTechs: ['pgAdmin', 'PostGIS', 'pg_dump', 'Citus', 'TimescaleDB'] },
    { name: 'Kafka', group: 'data_engineering', subTechs: ['Kafka Streams', 'Kafka Connect', 'Schema Registry', 'KSQL', 'Confluent'] },
    { name: 'Redis', group: 'data_engineering', subTechs: ['Redis Cluster', 'Redis Streams', 'RedisJSON', 'Redis Pub/Sub'] },
    { name: 'Kubernetes', group: 'data_engineering', subTechs: ['Helm', 'kubectl', 'Istio', 'ArgoCD', 'Kustomize', 'K9s'] },
    { name: 'OpenShift', group: 'data_engineering', subTechs: ['OC CLI', 'Routes', 'BuildConfig', 'Operators'] },
    { name: 'Docker', group: 'data_engineering', subTechs: ['Docker Compose', 'Dockerfile', 'Docker Swarm', 'Buildkit'] },
    { name: 'Spark', group: 'data_engineering', subTechs: ['PySpark', 'Spark SQL', 'Spark Streaming', 'MLlib'] },
    { name: 'Airflow', group: 'data_engineering', subTechs: ['DAGs', 'Operators', 'Sensors', 'XComs'] },
    { name: 'Elasticsearch', group: 'data_engineering', subTechs: ['Kibana', 'Logstash', 'Beats', 'ELK Stack'] },
    { name: 'Snowflake', group: 'data_engineering', subTechs: ['Snowpipe', 'Streams', 'Tasks', 'dbt + Snowflake'] },
    { name: 'dbt', group: 'data_engineering', subTechs: ['dbt Core', 'dbt Cloud', 'Jinja', 'dbt Tests'] },
    { name: 'Terraform', group: 'data_engineering', subTechs: ['HCL', 'Terraform Cloud', 'Modules', 'State Management'] },
    { name: 'BigQuery', group: 'data_engineering', subTechs: ['BigQuery ML', 'Scheduled Queries', 'Data Transfer Service'] },
    { name: 'Databricks', group: 'data_engineering', subTechs: ['Notebooks', 'Unity Catalog', 'Workflows', 'MLflow'] },
    { name: 'Grafana', group: 'data_engineering', subTechs: ['Dashboards', 'Alerting', 'Loki', 'Tempo'] },
    { name: 'AWS', group: 'cloud_and_platforms', subTechs: ['EC2', 'S3', 'Lambda', 'RDS', 'ECS', 'EKS', 'SQS', 'SNS', 'CloudFormation', 'IAM', 'CloudWatch', 'API Gateway'] },
    { name: 'Azure', group: 'cloud_and_platforms', subTechs: ['Azure Functions', 'AKS', 'Blob Storage', 'Azure SQL', 'CosmosDB', 'Azure DevOps', 'Event Hub', 'Data Factory'] },
    { name: 'GCP', group: 'cloud_and_platforms', subTechs: ['Cloud Functions', 'GKE', 'Cloud Storage', 'Cloud SQL', 'Pub/Sub', 'Dataflow', 'Cloud Run'] },
    { name: 'Git', group: 'cloud_and_platforms', subTechs: ['GitHub', 'GitLab', 'Bitbucket', 'Git Flow', 'GitHub Actions', 'GitLab CI'] },
    { name: 'Jenkins', group: 'cloud_and_platforms', subTechs: ['Jenkinsfile', 'Pipeline', 'Blue Ocean', 'Shared Libraries'] },
  ],
};

export const GROUP_LABELS: Record<string, string> = {
  languages: 'Languages',
  data_engineering: 'Data Engineering',
  cloud_and_platforms: 'Cloud & Platforms',
};

export const GROUP_ORDER = [
  'languages',
  'data_engineering',
  'cloud_and_platforms',
];

export default defaultSchema;
