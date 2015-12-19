var DAT = DAT || {};

DAT.Globe = function(container, colorFn) {

  colorFn = colorFn || function(x) {
    var c = new THREE.Color();
    c.setHSV( ( 0.6 - ( x * 0.5 ) ), 1.0, 1.0 );
    return c;
  };

  var Shaders = {
    'atmosphere' : {
      uniforms: {},
      vertexShader: [
        'varying vec3 vNormal;',
        'void main() {',
          'vNormal = normalize( normalMatrix * normal );',
          'gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );',
        '}'
      ].join('\n'),
      fragmentShader: [
        'varying vec3 vNormal;',
        'void main() {',
          'float intensity = pow( 0.8 - dot( vNormal, vec3( 0, 0, 1.0 ) ), 16.0 );',
          'gl_FragColor = vec4(1.0);',
          'gl_FragColor.a = intensity;',
        '}'
      ].join('\n')
    },
    'earth' : {
      uniforms: {
        'texture': { type: 't', value: 0, texture: null }
      },
      vertexShader: [
        'varying vec3 vNormal;',
        'varying vec2 vUv;',
        'void main() {',
          'gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );',
          'vNormal = normalize( normalMatrix * normal );',
          'vUv = uv;',
        '}'
      ].join('\n'),
      fragmentShader: [
        'uniform sampler2D texture;',
        'varying vec3 vNormal;',
        'varying vec2 vUv;',
        'void main() {',
          'vec3 diffuse = texture2D( texture, vUv ).xyz;',
          'float intensity = pow(1.05 - dot( vNormal, vec3( 0.0, 0.0, 1.0 ) ), 4.0);',
          'float i = 0.8-pow(clamp(dot( vNormal, vec3( 0, 0, 1.0 )), 0.0, 1.0), 1.5);',
          'vec3 atmosphere = vec3( 1.0, 1.0, 1.0 ) * intensity;',
          'float d = clamp(pow(max(0.0,(diffuse.r-0.062)*10.0), 2.0)*5.0, 0.0, 1.0);',
          'gl_FragColor = vec4( (d*vec3(i)) + ((1.0-d)*diffuse) + atmosphere, 1.0 );',
        '}'
      ].join('\n')
    },
    'continents' : {
      uniforms: {},
      vertexShader: [
        'varying vec3 vNormal;',
        'void main() {',
          'vec4 pos = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );',
          'vNormal = normalize( normalMatrix * normalize( position ));',
          'gl_Position = pos;',
        '}'
      ].join('\n'),
      fragmentShader: [
        'varying vec3 vNormal;',
        'void main() {',
          'float i = 0.8-pow(clamp(dot( vNormal, vec3( 0, 0, 1.0 )), 0.0, 1.0), 0.7);',
          'gl_FragColor = vec4(i);',
          'gl_FragColor.a = 1.0;',
        '}'
      ].join('\n')
    }
  };

  var camera, scene, sceneAtmosphere, tweetScene, renderer, w, h, CSSRenderer, controls;
  var vector, mesh, atmosphere, point;

  var overRenderer;

  var imgDir = '';

  var curZoomSpeed = 0;
  var zoomSpeed = 50;

  var mouse = { x: 0, y: 0 }, mouseOnDown = { x: 0, y: 0 };
  var rotation = { x: 0, y: 0 },
      target = { x: Math.PI*3/2, y: Math.PI / 6.0 },
      targetOnDown = { x: 0, y: 0 };

  var distance = 100000, distanceTarget = 1200;
  var padding = 40;
  var PI_HALF = Math.PI / 2;

  function init() {

    container.style.color = '#fff';
    container.style.font = '13px/20px Arial, sans-serif';

    var shader, uniforms, material;
    w = window.innerWidth;
    h = window.innerHeight;

    camera = new THREE.PerspectiveCamera( 40, window.innerWidth / window.innerHeight, 1, 10000 );
    camera.position.z = 800;

    vector = new THREE.Vector3();

    scene = new THREE.Scene();
    sceneAtmosphere = new THREE.Scene();
    tweetScene = new THREE.Scene();

    var spotLight = new THREE.SpotLight( 0xffffff, 0.5);
    spotLight.position.set( 100, 1000, 100 );
    
    spotLight.castShadow = true;
    
    spotLight.shadowMapWidth = 1024;
    spotLight.shadowMapHeight = 1024;
    
    spotLight.shadowCameraNear = 500;
    spotLight.shadowCameraFar = 4000;
    spotLight.shadowCameraFov = 30;
    
    scene.add( spotLight );

    var light = new THREE.HemisphereLight( 0x1797C9, 0x080820, 0.5 );
    scene.add( light );

    // projector = new THREE.Projector();
    var PI2 = Math.PI * 2;
    // particleMaterial = new THREE.MeshLambertMaterial( {
      // color: 0x000000
    // } );

    /*material = new THREE.ShaderMaterial({

          uniforms: uniforms,
          vertexShader: shader.vertexShader,
          fragmentShader: shader.fragmentShader

        });*/

    var ambLight = new THREE.AmbientLight(0x404040);
    scene.add(ambLight);

    geometry = new THREE.SphereGeometry(200, 40, 40);

    blueMaterial = new THREE.MeshLambertMaterial( { color: 0xB6E5FC, transparent: true, opacity: 0.1 } );

    mesh = new THREE.Mesh(geometry, blueMaterial);
    mesh.matrixAutoUpdate = false;
    scene.add(mesh);



    function loadLineMesh(loader, material, offset) {
      var lines = loader().children[0].children[0].attributes.Vertex.elements;
      var lineGeo = new THREE.Geometry();
      for (var i=0; i<lines.length; i+=3) {
        lineGeo.vertices.push(new THREE.Vector3(lines[i], lines[i+1], lines[i+2]));
      }
      var lineMesh = new THREE.Line(lineGeo, material);
      lineMesh.type = THREE.Lines;
      lineMesh.scale.x = lineMesh.scale.y = lineMesh.scale.z = 0.0000319 + offset * 0.0000001;
      lineMesh.rotation.x = -Math.PI/2;
      lineMesh.rotation.z = Math.PI;
      lineMesh.matrixAutoUpdate = false;
      lineMesh.updateMatrix();
      return lineMesh;
    }

    function loadTriMesh(loader, material) {
      var lines = loader().children[0].children[0].attributes.Vertex.elements;
      var lineGeo = new THREE.Geometry();
      var i = 0;
      for (i=0; i<lines.length; i+=3) {
        lineGeo.vertices.push(
            new THREE.Vector3(lines[i], lines[i+1], lines[i+2])
        );
      }
      for (i=0; i<lines.length/3; i+=3) {
        lineGeo.faces.push(new THREE.Face3(i, i+1, i+2, null, null));
      }
      console.log(lineGeo)
      // lineGeo.computeCentroids();
      lineGeo.computeFaceNormals();
      lineGeo.computeVertexNormals();
      lineGeo.computeBoundingSphere();
      material.side = THREE.DoubleSide;
      material.blending  = THREE.NoBlending;

      var lineMesh = new THREE.Mesh(lineGeo, material);
      lineMesh.type = THREE.Triangles;
      lineMesh.scale.x = lineMesh.scale.y = lineMesh.scale.z = 0.0000319;
      lineMesh.rotation.x = -Math.PI/2;
      lineMesh.rotation.z = Math.PI;
      lineMesh.matrixAutoUpdate = false;
      lineMesh.doubleSided = true;
      lineMesh.updateMatrix();
      return lineMesh;
    }


    shader = Shaders['continents'];
    uniforms = THREE.UniformsUtils.clone(shader.uniforms);

    //with shaders

    material = new THREE.ShaderMaterial({
          uniforms: uniforms,
          vertexShader: shader.vertexShader,
          fragmentShader: shader.fragmentShader

        });
    
    //without shaders
    // material = new THREE.MeshPhongMaterial( { color: 0x3CBCEF, specular: 0x050505, shininess: 100} );

    scene.add(loadTriMesh(getWorld, material));

    shader = Shaders['atmosphere'];
    uniforms = THREE.UniformsUtils.clone(shader.uniforms);

    material = new THREE.ShaderMaterial({

          uniforms: uniforms,
          vertexShader: shader.vertexShader,
          fragmentShader: shader.fragmentShader

        });


    mesh = new THREE.Mesh(geometry, material);
    mesh.scale.x = mesh.scale.y = mesh.scale.z = 1.1;
    mesh.matrixAutoUpdate = true;
    mesh.updateMatrix();
    // sceneAtmosphere.add(mesh);

    sceneAtmosphere.add(loadLineMesh(getCoast, new THREE.LineBasicMaterial({
      linewidth: 3,
      color:0x276F9C, opacity: 0.8
    }), -2));
    sceneAtmosphere.add(loadLineMesh(getCoast, new THREE.LineBasicMaterial({
      linewidth:1,
      color:0x276F9C, opacity: 0.4
    }), 0.5));

    renderer = new THREE.WebGLRenderer({antialias: true, alpha:true});
    renderer.autoClear = false;
    renderer.setClearColor(0x2b3036, 1.0);
    renderer.setSize(w, h);
    renderer.domElement.style.position = 'absolute';
    renderer.domElement.style.top = 0;
    renderer.domElement.style.zIndex  = 1;
    renderer.domElement.style.pointerEvents  = 'none';
    document.body.appendChild( renderer.domElement );

    var coastLine = getCoast();

    this.is_animated = false;
    this._baseGeometry = new THREE.Geometry();
    // createPoints();

    container.appendChild(renderer.domElement);

    controls = new THREE.OrbitControls( camera );
    controls.addEventListener( 'change', render );
    controls.noZoom = false;


    CSSRenderer = new THREE.CSS3DRenderer();
    CSSRenderer.setSize( window.innerWidth, window.innerHeight );
    CSSRenderer.domElement.style.position = 'absolute';
    CSSRenderer.domElement.style.top = 0;
    // CSSRenderer.domElement.style.zIndex  = 10;
    container.appendChild( CSSRenderer.domElement );
  }

  var transformCoordinates = function(lat, lng, offset) {
      var phi = (90 - lat) * Math.PI / 180;
      var theta = (180 - lng) * Math.PI / 180;
  
      var x = (200 + offset) * Math.sin(phi) * Math.cos(theta);
      var y = (200 + offset) * Math.cos(phi);
      var z = (200 + offset) * Math.sin(phi) * Math.sin(theta);

      return new THREE.Vector3(x, y, z)
  }


  var addCityMarker = function(city) {
    var lat = 53, lng = 27;
    var markerSize = 2;
    var geometry = new THREE.SphereGeometry(markerSize, 16, 16);
    var blueMaterial = new THREE.MeshPhongMaterial( { color: 0xF20A0A} );
    var mesh = new THREE.Mesh(geometry, blueMaterial);
    mesh.position = transformCoordinates(lat, lng, markerSize*2)
    var light = new THREE.PointLight( 0xff0000, 1, 100 );
    light.position = transformCoordinates(lat, lng, markerSize*4)
    scene.add( light );
    scene.add(mesh);
  }

  var addTweetMarker = function(tweet) {
      var material = new THREE.MeshBasicMaterial();
      var geometry = new THREE.PlaneGeometry(102, 32, 32);
      material.color.set('black')
      material.opacity   = 0;
      material.blending  = THREE.NoBlending;
      material.side = THREE.DoubleSide;
      var planeMesh= new THREE.Mesh( geometry, material );

      planeMesh.position = transformCoordinates(tweet.lat, tweet.lng, 30);
      vector = transformCoordinates(tweet.lat, tweet.lng, 40);

      planeMesh.lookAt(vector);
      planeMesh.name = tweet.id.toString();

      scene.add(planeMesh);
  
      var element = document.createElement( 'div' );
      element.className = 'element';
      var text = document.createElement('p');
      text.innerHTML = tweet.text;
      var image = document.createElement('img');
      image.src = tweet.image;
      var i = document.createElement('i');
      i.className = "fa fa-times";
      i.id = tweet.id;

      i.onclick = function(event) {
        var id = event.target.id.toString();

        TWEEN.removeAll();

        var tweet = tweetScene.getObjectByName(id);
        var tweetPlane = scene.getObjectByName(id);

        var moveTween = new TWEEN.Tween(tweetPlane.position)
            .to( { x: 1000, y: 1000, z: 1000 },1000)
            .easing( TWEEN.Easing.Exponential.InOut );

        moveTween.start();
        moveTween.onComplete(function() {
          tweetScene.remove(tweet);
          scene.remove(tweetPlane);
        });

        /*var rotateTween =  new TWEEN.Tween( tweetPlane.rotation )
            .to( { x: 10, y: 10, z: 10 }, 1000 )
            .easing( TWEEN.Easing.Exponential.InOut )
        rotateTween.start();*/
      };

      element.appendChild( image );
      element.appendChild(text);
      element.appendChild(i);
  
      object = new THREE.CSS3DObject(element );
      object.name = tweet.id.toString();

      object.scale.x = 0.125;
      object.scale.y = 0.125;
  
      object.position = planeMesh.position;
      object.lookAt(vector);
  
      tweetScene.add(object);
      render();
    }

  function animate(t) {
    requestAnimationFrame(animate);
    TWEEN.update();
    controls.update();
    render();
  }

  angle = 0;
  radius = 1000;

  function render() {
    // zoom(curZoomSpeed);
    /*camera.position.x = radius * Math.cos( angle );  
    camera.position.z = radius * Math.sin( angle );
    camera.lookAt(new THREE.Vector3(0,0,0));
    angle += 0.005;
    if (angle > Math.PI*2) angle = 0;*/

    CSSRenderer.render(tweetScene, camera);
    renderer.clear();
    renderer.render(scene, camera);
    renderer.render(sceneAtmosphere, camera);
  }

  init();
  // transform([], 2000 )
  this.animate = animate;
  animate();

  this.renderer = renderer;
  this.scene = scene;
  this.addTweet = addTweetMarker;
  this.addCityMarker = addCityMarker;

  return this;

};
