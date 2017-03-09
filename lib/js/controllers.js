var archemCtrls = angular.module('archemCtrls', []);

archemCtrls.controller('mainCtrl', [
  '$scope',
  '$window',
  function($scope, $window) {

    var camera, scene, renderer;
    var root, loader;
    var molecule;

    // Controls Vars
    var mouseDown = false;
    var rotateStartPoint = new THREE.Vector3(0, 0, 1);
    var rotateEndPoint = new THREE.Vector3(0, 0, 1);

    var curQuarternion;
    var windowHalfX = window.innerWidth / 2;
    var windowHalfY = window.innerHeight / 2;
    var rotationSpeed = 2;
    var lastMoveTimestamp,
          moveReleaseTimeDelta = 50;

    var startPoint = {
      x: 0,
      y: 0
    };

    var deltaX = 0;
    var deltaY = 0;

    function ARThreeOnLoad() {

      ARController.getUserMediaThreeScene({
          maxARVideoSize: 320,
          cameraParam: 'Data/camera_para.dat',
          // facing: 'environment',
          onSuccess: function(arScene, arController, arCameraParam) {

        // alert('scene');
        scene = arScene;
        camera = arCameraParam;
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

        var light = new THREE.DirectionalLight(0xffffff, 0.8);
        light.position.set(1, 1, -1);
        arScene.scene.add(light);

        var light1 = new THREE.DirectionalLight(0xffffff, 0.5);
        light1.position.set(-1, -1, -1);
        arScene.scene.add(light1);

        loader = new THREE.PDBLoader();
        root = new THREE.Group();
        molecule = root;
        markerRoot.add(root);
        arScene.scene.add(markerRoot);
        loadMolecule('/models/molecules/caffeine.pdb');

        document.addEventListener('mousedown', onDocumentMouseDown, false);

        animate();

    	},
      onError: function(err) {
        alert('Error: ' + err.message);
      }});

    	delete $window.ARThreeOnLoad;

    }

    function loadMolecule( url ) {
    	while ( root.children.length > 0 ) {
    		var object = root.children[ 0 ];
    		object.parent.remove( object );
    	}
    	loader.load( url, function ( geometry, geometryBonds, json ) {
        // Settings
        var zOffset = 1.5;
        var posScale = 0.3;
        var atomScale = posScale / 3;
        var bondScale = atomScale / 5;

    		var boxGeometry = new THREE.BoxBufferGeometry( 1, 1, 1 );
    		var sphereGeometry = new THREE.IcosahedronBufferGeometry( 1, 2 );
    		var offset = geometry.center();
    		geometryBonds.translate( offset.x, offset.y, offset.z + zOffset );
    		var positions = geometry.getAttribute( 'position' );
    		var colors = geometry.getAttribute( 'color' );
    		var position = new THREE.Vector3();
    		var color = new THREE.Color();
    		for ( var i = 0; i < positions.count; i ++ ) {
    			position.x = positions.getX( i );
    			position.y = positions.getY( i );
    			position.z = positions.getZ( i ) + zOffset;
    			color.r = colors.getX( i );
    			color.g = colors.getY( i );
    			color.b = colors.getZ( i );
    			var element = geometry.elements[ i ];
    			var material = new THREE.MeshPhongMaterial( { color: color } );
    			var object = new THREE.Mesh( sphereGeometry, material );
    			object.position.copy( position );
    			object.position.multiplyScalar( posScale );
    			object.scale.multiplyScalar( atomScale );
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
    			start.multiplyScalar( posScale );
    			end.multiplyScalar( posScale );
    			var obj = new THREE.Mesh( boxGeometry, new THREE.MeshPhongMaterial( 0xffffff ) );
    			obj.position.copy( start );
    			obj.position.lerp( end, 0.5 );
    			obj.scale.set( bondScale, bondScale, start.distanceTo( end ) );
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

    function onDocumentMouseDown(event)	{
  		event.preventDefault();

  		document.addEventListener('mousemove', onDocumentMouseMove, false);
  		document.addEventListener('mouseup', onDocumentMouseUp, false);

  		mouseDown = true;

  		startPoint = {
  			x: event.clientX,
  			y: event.clientY
  		};

  		rotateStartPoint = rotateEndPoint = projectOnTrackball(0, 0);
  	}

  	function onDocumentMouseMove(event)	{
  		deltaX = event.x - startPoint.x;
  		deltaY = event.y - startPoint.y;

  		handleRotation();

  		startPoint.x = event.x;
  		startPoint.y = event.y;

  		lastMoveTimestamp = new Date();
  	}

  	function onDocumentMouseUp(event)	{
  		if (new Date().getTime() - lastMoveTimestamp.getTime() > moveReleaseTimeDelta) {
  			deltaX = event.x - startPoint.x;
  			deltaY = event.y - startPoint.y;
  		}

  		mouseDown = false;

  		document.removeEventListener('mousemove', onDocumentMouseMove, false);
  		document.removeEventListener('mouseup', onDocumentMouseUp, false);
  	}

  	function projectOnTrackball(touchX, touchY)	{
  		var mouseOnBall = new THREE.Vector3();

  		mouseOnBall.set(
  			clamp(touchX / windowHalfX, -1, 1), clamp(-touchY / windowHalfY, -1, 1),
  			0.0
  		);

  		var length = mouseOnBall.length();

  		if (length > 1.0)	{
  			mouseOnBall.normalize();
  		}
  		else {
  			mouseOnBall.z = Math.sqrt(1.0 - length * length);
  		}

  		return mouseOnBall;
  	}

  	function rotateMatrix(rotateStart, rotateEnd)	{
  		var axis = new THREE.Vector3(),
  			quaternion = new THREE.Quaternion();

  		var angle = Math.acos(rotateStart.dot(rotateEnd) / rotateStart.length() / rotateEnd.length());

  		if (angle) {
  			axis.crossVectors(rotateStart, rotateEnd).normalize();
  			angle *= rotationSpeed;
  			quaternion.setFromAxisAngle(axis, angle);
  		}
  		return quaternion;
  	}

  	function clamp(value, min, max) {
  		return Math.min(Math.max(value, min), max);
  	}

    function animate() {
      requestAnimationFrame(animate);
      render();
    }

    function render() {

      if (!mouseDown) {
  			var drag = 0.95;
  			var minDelta = 0.05;

  			if (deltaX < -minDelta || deltaX > minDelta) {
  				deltaX *= drag;
  			}
  			else {
  				deltaX = 0;
  			}

  			if (deltaY < -minDelta || deltaY > minDelta) {
  				deltaY *= drag;
  			}
  			else {
  				deltaY = 0;
  			}

  			handleRotation();
  		}

      scene.process();
      scene.renderOn(renderer);
    }

    function handleRotation() {
  		rotateEndPoint = projectOnTrackball(deltaX, deltaY);

  		var rotateQuaternion = rotateMatrix(rotateStartPoint, rotateEndPoint);
  		curQuaternion = molecule.quaternion;
  		curQuaternion.multiplyQuaternions(rotateQuaternion, curQuaternion);
  		curQuaternion.normalize();
  		molecule.setRotationFromQuaternion(curQuaternion);

  		rotateEndPoint = rotateStartPoint;
  	}

    if ($window.ARController && ARController.getUserMediaThreeScene) {
    	ARThreeOnLoad();
    }
  }
]);
