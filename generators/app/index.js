const Generator = require('yeoman-generator');

module.exports = class extends Generator {
  async prompting() {
    const answers = await this.prompt([{
      type: 'input',
      name: 'serviceName',
      message: 'Your service name',
      default: this.appname // Default to current folder name
    }, {
      type: 'list',
      name: 'serviceType',
      message: 'Service type',
      choices: ['koa web service', 'plain web service', 'scheduled task'],
      default: 'web service'
    }, {
      type: 'confirm',
      name: 'dynamodb',
      message: 'Would you like to use DynamoDB?'
    }, {
      type: 'confirm',
      name: 'logForwarding',
      message: 'Would you like to use log forwarding?',
      default: false
    }, {
      type: 'confirm',
      name: 'vpc',
      message: 'Would you like to put the Lambda functions in a VPC?',
      default: false
    }]);
    answers.authorizer = false;

    if (/web service$/.test(answers.serviceType)) {
      const auth = await this.prompt([{
        type: 'confirm',
        name: 'authorizer',
        message: 'Would you like to use a custom authorizer for the API Gateway routes?',
        default: false
      }]);
      answers.authorizer = auth.authorizer;
    }
    switch (answers.serviceType) {
      case 'koa web service':
        this.composeWith(require.resolve('../koa-web-service'), {
          answers, config: this.config,
        });
        break;
      case 'plain web service':
        this.composeWith(require.resolve('../plain-web-service'));
        break;
      case 'scheduled task':
        this.composeWith(require.resolve('../task'));
        break;
    }
    this.answers = answers;
    this.config.set('pkgJson', {});
    this.config.set('answers', answers);
  }

  install() {
    this.npmInstall();
  }
};
