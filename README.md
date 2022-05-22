# Cheesy Path
Cheesy Path, an external Java webapp, is used for fast and simple path creation. The app allows a user to create and visualize autonomous paths.

## Getting Started
These instructions will get you a copy of the project up and running on your local machine for development, testing, and use.

### Dependencies
- spring-webmvc 4.3.0.RELEASE
- javax.servlet-api 3.0.1
- jstl 1.2

### Installing
- Clone this Repository (`git clone https://github.com/Team254/cheesy-path.git`)
- Run app with `./gradlew tomcatRun` and open [http://localhost:8080/](http://localhost:8080/)
- To stop run `./gradlew tomcatStop`

### Import Into IDEs
- To import into the Eclipse IDE, run `mvn eclipse:eclipse`, then open project in Eclipse
- To import into IntelliJ, run `./gradlew idea`, then open the generated `.ipr` file in IntelliJ