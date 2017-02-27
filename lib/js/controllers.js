var archemCtrls = angular.module('archemCtrls', []);

archemCtrls.controller('mainCtrl', [
  '$scope',
  '$window',
  function($scope, $window) {

    var camera, scene, renderer;
    var controls;
    var root, loader;

    $window.ARThreeOnLoad = function() {

    	ARController.getUserMediaThreeScene({maxARVideoSize: 960, cameraParam: 'Data/camera_para.dat',
    	onSuccess: function(arScene, arController, arCamera) {

        scene = arScene;
        camera = arCamera;
    		document.body.className = arController.orientation;

    		arController.setPatternDetectionMode(artoolkit.AR_MATRIX_CODE_DETECTION);

    		renderer = new THREE.WebGLRenderer({antialias: true});
    		if (arController.orientation === 'portrait') {
    			var w = ($window.innerWidth / arController.videoHeight) * arController.videoWidth;
    			var h = $window.innerWidth;
    			renderer.setSize(w, h);
    			renderer.domElement.style.paddingBottom = (w-h) + 'px';
    		} else {
    			if (/Android|mobile|iPad|iPhone/i.test(navigator.userAgent)) {
    				renderer.setSize($window.innerWidth, ($window.innerWidth / arController.videoWidth) * arController.videoHeight);
    			} else {
    				renderer.setSize(arController.videoWidth, arController.videoHeight);
    				document.body.className += ' desktop';
    			}
    		}

        document.body.insertBefore(renderer.domElement, document.body.firstChild);

        // See /doc/patterns/Matrix code 3x3 (72dpi)/20.png
        var markerRoot = arController.createThreeBarcodeMarker(20);

        // var sphere = new THREE.Mesh(
        //   new THREE.SphereGeometry(0.5, 8, 8),
        //   new THREE.MeshNormalMaterial()
        // );
        // sphere.material.shading = THREE.FlatShading;
        // sphere.position.z = 0.5;
        // markerRoot.add(sphere);
        // arScene.scene.add(markerRoot);

        loader = new THREE.PDBLoader();
        root = new THREE.Group();
        markerRoot.add(root);
        arScene.scene.add(markerRoot);
        loadMolecule('/models/molecules/caffeine.pdb');

        var rotationV = 0;
        var rotationTarget = 0;

        renderer.domElement.addEventListener('click', function(ev) {
          ev.preventDefault();
          rotationTarget += 1;
        }, false);

    		var tick = function() {
    			arScene.process();
    			arScene.renderOn(renderer);
    			// rotationV += (rotationTarget - sphere.rotation.z) * 0.05;
    			// sphere.rotation.z += rotationV;
    			// rotationV *= 0.8;

    			requestAnimationFrame(tick);
    		};

    		tick();

    	}});

    	delete $window.ARThreeOnLoad;

    };


    function loadMolecule( url ) {
    	while ( root.children.length > 0 ) {
    		var object = root.children[ 0 ];
    		object.parent.remove( object );
    	}
    	loader.load( url, function ( geometry, geometryBonds, json ) {
    		var boxGeometry = new THREE.BoxBufferGeometry( 1, 1, 1 );
    		var sphereGeometry = new THREE.IcosahedronBufferGeometry( 1, 2 );
    		var offset = geometry.center();
    		geometryBonds.translate( offset.x, offset.y, offset.z );
    		var positions = geometry.getAttribute( 'position' );
    		var colors = geometry.getAttribute( 'color' );
    		var position = new THREE.Vector3();
    		var color = new THREE.Color();
    		for ( var i = 0; i < positions.count; i ++ ) {
    			position.x = positions.getX( i );
    			position.y = positions.getY( i );
    			position.z = positions.getZ( i );
    			color.r = colors.getX( i );
    			color.g = colors.getY( i );
    			color.b = colors.getZ( i );
    			var element = geometry.elements[ i ];
    			var material = new THREE.MeshPhongMaterial( { color: color } );
    			var object = new THREE.Mesh( sphereGeometry, material );
    			object.position.copy( position );
    			object.position.multiplyScalar( 75 );
    			object.scale.multiplyScalar( 25 );
    			root.add( object );
    			var atom = json.atoms[ i ];
    			var text = document.createElement( 'div' );
    			text.className = 'label';
    			text.style.color = 'rgb(' + atom[ 3 ][ 0 ] + ',' + atom[ 3 ][ 1 ] + ',' + atom[ 3 ][ 2 ] + ')';
    			text.textContent = atom[ 4 ];
    			var label = new THREE.CSS2DObject( text );
    			label.position.copy( object.position );
    			root.add( label );
    		}
    		positions = geometryBonds.getAttribute( 'position' );
    		var start = new THREE.Vector3();
    		var end = new THREE.Vector3();
    		for ( var j = 0; j < positions.count; j += 2 ) {
    			start.x = positions.getX( j );
    			start.y = positions.getY( j );
    			start.z = positions.getZ( j );
    			end.x = positions.getX( j + 1 );
    			end.y = positions.getY( j + 1 );
    			end.z = positions.getZ( j + 1 );
    			start.multiplyScalar( 75 );
    			end.multiplyScalar( 75 );
    			var obj = new THREE.Mesh( boxGeometry, new THREE.MeshPhongMaterial( 0xffffff ) );
    			obj.position.copy( start );
    			obj.position.lerp( end, 0.5 );
    			obj.scale.set( 5, 5, start.distanceTo( end ) );
    			obj.lookAt( end );
    			root.add( obj );
    		}
    	}, function ( xhr ) {
    		if ( xhr.lengthComputable ) {
    			var percentComplete = xhr.loaded / xhr.total * 100;
    			console.log( Math.round( percentComplete, 2 ) + '% downloaded' );
    		}
    	}, function ( xhr ) {
    	} );
    }

  }
]);
