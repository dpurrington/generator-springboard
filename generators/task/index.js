const Generator = require('yeoman-generator');

module.exports = class extends Generator {
  constructor(args, opts) {
    super(args, opts);
    this.answers = opts.answers;
    this.config = opts.config;
  }

  async configuring() {
    let pkgJson = this.config.get('pkgJson');
    const scripts = {
      start: 'source env/local.env && serverless offline start -s local',
    };
    if (pkgJson) { pkgJson.scripts = scripts }
    else { pkgJson = { scripts }; }

    this.config.set('pkgJson', pkgJson);
    this.answers = this.config.get('answers');
  }

  async writing() {
    this.fs.copyTpl(
      this.templatePath('.eslintrc'),
      this.destinationPath('.eslintrc'),
      this.answers,
    );

    this.fs.copyTpl(
      this.templatePath('.gitignore_temp'),
      this.destinationPath('.gitignore'),
      this.answers,
    );

    this.fs.copyTpl(
      this.templatePath('**/*'),
      this.destinationPath(),
      this.answers
    );
  }
};
