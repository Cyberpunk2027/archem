var app = angular.module('archem', [
  'ui.router',
  'archemCtrls'
]);

app.config([
  '$stateProvider',
  '$urlRouterProvider',
  function($stateProvider, $urlRouterProvider) {

    $stateProvider
      .state('/', {
        url: '/',
        templateUrl: '/templates/home.html',
        controller: 'mainCtrl'
      });

      $urlRouterProvider.otherwise('/');
  }
]);
