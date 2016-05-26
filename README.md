# Airbus Web UI OGC - Proof Of Concept (POC)

1) Go to webui folder and run first
    npm install

2) for prod environment start web application by running
    grunt build

3) for developers run
    grunt dev

4) you need to start proxy server, go to proxy folder run the following command
java -jar target/proxy-0.1-SNAPSHOT-fat.jar

5) Open the application at http://localhost:9000/ with your web browser


To deploy on server run
grunt build

then copy the dist directory into the apache folder and rename this folder to webui
