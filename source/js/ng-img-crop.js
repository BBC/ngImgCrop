'use strict';

crop.directive('imgCrop', ['$timeout', 'cropHost', 'cropPubSub', function ($timeout, CropHost, CropPubSub) {
    return {
        restrict: 'E',
        scope: {
            image: '=',
            resultImage: '=',

            changeOnFly: '=',
            areaCoords: '=',
            areaType: '@',
            aspectRatio: '=',
            areaMinSize: '=',
            resultImageSize: '=',
            resultImageFormat: '@',
            resultImageQuality: '=',
            canvasSize: '=',
            onChange: '&',
            onLoadBegin: '&',
            onLoadDone: '&',
            onLoadError: '&',
            manuallyCrop: '=?'
        },
        template: '<canvas></canvas>',
        controller: ['$scope', function ($scope) {
            $scope.events = new CropPubSub();
        }],
        link: function (scope, element, attrs) {
            // Init Events Manager
            var events = scope.events;

            // Init Crop Host
            var cropHost = new CropHost(element.find('canvas'), {}, events);

            // Store Result Image to check if it's changed
            var storedResultImage;

            var updateResultImage = function (scope) {
                updateAreaCoords(scope);
                var resultImage = cropHost.getResultImageDataURI();
                if (storedResultImage !== resultImage) {
                    storedResultImage = resultImage;
                    if (angular.isDefined(scope.resultImage)) {
                        scope.resultImage = resultImage;
                    }
                    scope.onChange({$dataURI: scope.resultImage});
                }
            };

            var updateAreaCoords = function (scope) {
                if (typeof scope.areaCoords != 'undefined') {
                    var areaCoords = cropHost.getAreaCoords();
                    scope.areaCoords = areaCoords;
                }
            };

            // Wrapper to safely exec functions within $apply on a running $digest cycle
            var fnSafeApply = function (fn) {
                return function () {
                    $timeout(function () {
                        scope.$apply(function (scope) {
                            fn(scope);
                        });
                    });
                };
            };

            // Setup CropHost Event Handlers
            events
                .on('load-start', fnSafeApply(function (scope) {
                    scope.onLoadBegin({});
                }))
                .on('load-done', fnSafeApply(function (scope) {
                    scope.onLoadDone({});
                }))
                .on('load-error', fnSafeApply(function (scope) {
                    scope.onLoadError({});
                }))
                .on('area-move area-resize', fnSafeApply(function (scope) {
                    if (!!scope.changeOnFly) {
                        updateResultImage(scope);
                    }
                }))
                .on('area-move-end area-resize-end image-updated', fnSafeApply(function (scope) {
                    if(!!!attrs.manuallyCrop) {
                        updateResultImage(scope);
                    }
                }));

            // Sync CropHost with Directive's options
            scope.$watch('image', function () {
                cropHost.setNewImageSource(scope.image);
            });
            scope.$watch('areaType', function () {
                cropHost.setAreaType(scope.areaType);
                updateResultImage(scope);
            });
            scope.$watch('aspectRatio', function () {
                cropHost.setAspectRatio(scope.aspectRatio);
                updateResultImage(scope);
            });
            scope.$watch('areaMinSize', function () {
                cropHost.setAreaMinSize(scope.areaMinSize);
                updateResultImage(scope);
            });
            scope.$watch('resultImageSize', function () {
                cropHost.setResultImageSize(scope.resultImageSize);
                updateResultImage(scope);
            });
            scope.$watch('resultImageFormat', function () {
                cropHost.setResultImageFormat(scope.resultImageFormat);
                updateResultImage(scope);
            });
            scope.$watch('resultImageQuality', function () {
                cropHost.setResultImageQuality(scope.resultImageQuality);
                updateResultImage(scope);
            });

            scope.$watch('canvasSize', function (newVal, oldVal) {
                if (newVal) {
                    var update = false;
                    if (!oldVal) {
                        update = true;
                    }
                    else if (newVal[0] === oldVal[0] && newVal[1] === oldVal[1]) {
                        update = false;
                    }
                    else {
                        update = true;
                    }

                    if (update) {
                        cropHost.setCanvasSize(newVal);
                        updateResultImage(scope);
                    }
                }
            });

            scope.manuallyCrop = function() {
                updateResultImage(scope);
            }

            // Update CropHost dimensions when the directive element is resized
            scope.$watch(
                function () {
                    return [element[0].clientWidth, element[0].clientHeight];
                },
                function (value) {
                    cropHost.setMaxDimensions(value[0], value[1]);
                    updateResultImage(scope);
                },
                true
            );

            // Destroy CropHost Instance when the directive is destroying
            scope.$on('$destroy', function () {
                cropHost.destroy();
            });

        }
    }
        ;
}])
;