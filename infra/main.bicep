// WordSprint — Azure infrastructure (Bicep)
// Deploys: Container Apps (client + server), Azure Managed Redis,
// PostgreSQL Flexible Server, Key Vault, Container Registry, Log Analytics,
// Application Insights. Backend services use private access in production.
//
// Deploy:
//   az group create -n wordsprint-rg -l centralindia
//   az deployment group create -g wordsprint-rg -f infra/main.bicep \
//     -p namePrefix=wordsprint pgAdminPassword=<secret>

@description('Short prefix for all resource names')
param namePrefix string = 'wordsprint'

@description('Location for all resources')
param location string = resourceGroup().location

@description('PostgreSQL administrator password')
@secure()
param pgAdminPassword string

@description('Container image for the server (in ACR)')
param serverImage string = 'wordsprint-server:latest'

@description('Container image for the client (in ACR)')
param clientImage string = 'wordsprint-client:latest'

var tags = { app: 'wordsprint', env: 'prod' }

// ---------------- Observability ----------------
resource logs 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: '${namePrefix}-logs'
  location: location
  tags: tags
  properties: { retentionInDays: 30, sku: { name: 'PerGB2018' } }
}

resource appInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: '${namePrefix}-ai'
  location: location
  kind: 'web'
  tags: tags
  properties: { Application_Type: 'web', WorkspaceResourceId: logs.id }
}

// ---------------- Container Registry ----------------
resource acr 'Microsoft.ContainerRegistry/registries@2023-11-01-preview' = {
  name: '${namePrefix}acr'
  location: location
  tags: tags
  sku: { name: 'Standard' }
  properties: { adminUserEnabled: false }
}

// ---------------- Key Vault ----------------
resource kv 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: '${namePrefix}-kv'
  location: location
  tags: tags
  properties: {
    sku: { family: 'A', name: 'standard' }
    tenantId: subscription().tenantId
    enableRbacAuthorization: true
    enableSoftDelete: true
  }
}

// ---------------- Azure Managed Redis ----------------
// Live room state, presence, deadlines, idempotency, Socket.IO adapter.
resource redis 'Microsoft.Cache/redis@2024-03-01' = {
  name: '${namePrefix}-redis'
  location: location
  tags: tags
  properties: {
    sku: { name: 'Standard', family: 'C', capacity: 1 }
    enableNonSslPort: false
    minimumTlsVersion: '1.2'
  }
}

// ---------------- PostgreSQL Flexible Server ----------------
// Durable history: games, rounds, submissions, final scores.
resource pg 'Microsoft.DBforPostgreSQL/flexibleServers@2023-06-01-preview' = {
  name: '${namePrefix}-pg'
  location: location
  tags: tags
  sku: { name: 'Standard_B1ms', tier: 'Burstable' }
  properties: {
    version: '16'
    administratorLogin: 'wsadmin'
    administratorLoginPassword: pgAdminPassword
    storage: { storageSizeGB: 32 }
    backup: { backupRetentionDays: 7, geoRedundantBackup: 'Disabled' }
    highAvailability: { mode: 'Disabled' }
  }
}

resource pgDb 'Microsoft.DBforPostgreSQL/flexibleServers/databases@2023-06-01-preview' = {
  parent: pg
  name: 'wordsprint'
  properties: { charset: 'UTF8', collation: 'en_US.utf8' }
}

// ---------------- Container Apps Environment ----------------
resource cae 'Microsoft.App/managedEnvironments@2024-03-01' = {
  name: '${namePrefix}-cae'
  location: location
  tags: tags
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: logs.properties.customerId
        sharedKey: logs.listKeys().primarySharedKey
      }
    }
  }
}

// ---------------- Server app (Socket.IO) ----------------
resource serverApp 'Microsoft.App/containerApps@2024-03-01' = {
  name: '${namePrefix}-server'
  location: location
  tags: tags
  identity: { type: 'SystemAssigned' }
  properties: {
    managedEnvironmentId: cae.id
    configuration: {
      ingress: { external: true, targetPort: 4000, transport: 'auto', allowInsecure: false }
      registries: [ { server: acr.properties.loginServer, identity: 'system' } ]
    }
    template: {
      containers: [
        {
          name: 'server'
          image: '${acr.properties.loginServer}/${serverImage}'
          resources: { cpu: json('0.5'), memory: '1Gi' }
          env: [
            { name: 'PORT', value: '4000' }
            { name: 'CORS_ORIGIN', value: 'https://${namePrefix}-client.${cae.properties.defaultDomain}' }
            { name: 'REDIS_URL', value: 'rediss://${redis.properties.hostName}:6380' }
            { name: 'APPLICATIONINSIGHTS_CONNECTION_STRING', value: appInsights.properties.ConnectionString }
          ]
        }
      ]
      scale: { minReplicas: 1, maxReplicas: 5 }
    }
  }
}

// ---------------- Client app (static via nginx) ----------------
resource clientApp 'Microsoft.App/containerApps@2024-03-01' = {
  name: '${namePrefix}-client'
  location: location
  tags: tags
  identity: { type: 'SystemAssigned' }
  properties: {
    managedEnvironmentId: cae.id
    configuration: {
      ingress: { external: true, targetPort: 80, transport: 'auto', allowInsecure: false }
      registries: [ { server: acr.properties.loginServer, identity: 'system' } ]
    }
    template: {
      containers: [
        {
          name: 'client'
          image: '${acr.properties.loginServer}/${clientImage}'
          resources: { cpu: json('0.25'), memory: '0.5Gi' }
        }
      ]
      scale: { minReplicas: 1, maxReplicas: 3 }
    }
  }
}

output serverFqdn string = serverApp.properties.configuration.ingress.fqdn
output clientFqdn string = clientApp.properties.configuration.ingress.fqdn
output acrLoginServer string = acr.properties.loginServer
