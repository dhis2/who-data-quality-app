const { readFileSync, writeFileSync } = require('fs');
const { i18nextToPot } = require('i18next-conv');
const recursive = require("recursive-readdir");

const argv = require('minimist')(process.argv.slice(2));
const filename = argv['o'] || 'en.pot';

const HTML_FUNCTION_REGEX = new RegExp("{{ *'([^']*)' *| *i18next *}}", 'g');
const JS_FUNCTION_REGEX = new RegExp("\\$i18next\\.t\\('([^']*)'\\)", 'g');

const getFileExtension = (filename) => {
  return filename.split('.').pop();
};

// save file to disk
const save = (target) => {
  return result => {
    writeFileSync(target, result);
  };
};

let translations = {};
const addKeysFromFileContent = (fileContent, functionRegex) => {
  let matches;
  while (( matches = functionRegex.exec(fileContent))) {
    if (matches[1]) {
      translations[matches[1]] = '';
    }
  }
};

recursive('src', function (err, files) {
  for (let file of files) {
    const fileExtension = getFileExtension(file);
    if (fileExtension === 'html') {
      addKeysFromFileContent(readFileSync(file, 'utf-8'), HTML_FUNCTION_REGEX);
    } else if (fileExtension === 'js') {
      addKeysFromFileContent(readFileSync(file, 'utf-8'), JS_FUNCTION_REGEX);
    }
  }

  i18nextToPot('en', JSON.stringify(translations)).then(save('./i18n/' + filename));
});
