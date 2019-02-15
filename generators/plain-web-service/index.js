const Generator = require('yeoman-generator');

module.exports = class extends Generator {
  async writing() {
    const pkgJson = this.config.get('pkgJson');
    pkgJson.scripts = {
      start: 'source env/local.env && serverless offline start -s local',
    };
    this.config.set('pkgJson', pkgJson);
    const answers = this.config.get('answers');

    this.fs.copyTpl(
      this.templatePath('**/*'),
      this.destinationPath(),
      answers
    );
  }
};
