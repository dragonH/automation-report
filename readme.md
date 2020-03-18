# Automation report
## Automation Report base on aws

# Usage
- install node.js
- npm install aws-cli serverless & set youe aws configure
- clone this project
- npm install in project root folder
- create `.env.development` file with following data: 
```
stage = dev
profile = {YOUR AWS PROFILE NAME}
user = {YOUR NAME}
email = {YOUR EMAIL}
password = {YOUR PASSWORD}
```
- run `npm deploy` to deploy