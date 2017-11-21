# WHO Data Quality Tool

## License
© Copyright 2017 the World Health Organization (WHO).
This software is distributed under the terms of the GNU General Public License version 3 (GPL Version 3),
copied verbatim in the file “COPYING”.  In applying this license, WHO does not waive any of the privileges and
immunities enjoyed by WHO under national or international law or submit to any national court jurisdiction.

## Getting started
The app uses webpack, based on [d2-app-base](https://github.com/dhis2/d2-app-base) 
with some modifications.

### Install dependencies
To install app dependencies:

```
npm install
```
Because of an issue in the current setup, two commands needs to be run immediately after `npm install` to revert changes done during installation (the d2-app-base postinstall script). It must be done before any changes are made, else these will be overwritten.
```
git clean -df
git checkout -- .
```

### Compile to zip
To compile the app to a .zip file:

```
npm run zip
```

### Start dev server
To start the webpack development server:

```
npm start
```

By default, webpack will start on port 8081, and assumes DHIS2 is running on 
http://localhost:8080/dhis with admin:district as the user and password.

