/**
 * @class Meshdrawer
 * @description Helper class for drawing meshes.
 * 
 */
class MeshDrawer {
	constructor(isLightSource = false) {
		// comile shader program
		this.prog = InitShaderProgram(meshVS, meshFS);

		// get attribute locations
		this.positionLoc = gl.getAttribLocation(this.prog, 'position');
		this.normalLoc = gl.getAttribLocation(this.prog, 'normal');
		this.texCoordLoc = gl.getAttribLocation(this.prog, 'texCoord');

		// get uniform locations
		//vertex
		this.mvpLoc = gl.getUniformLocation(this.prog, 'mvp');
		this.mvLoc = gl.getUniformLocation(this.prog, 'mv');
		this.mvNormalLoc = gl.getUniformLocation(this.prog, 'normalMV');
		this.modelMatrixLoc = gl.getUniformLocation(this.prog, 'modelMatrix');

		// fragment
		this.isLightSourceLoc = gl.getUniformLocation(this.prog, 'isLightSource');
		this.samplerLoc = gl.getUniformLocation(this.prog, 'tex');

		// create array buffers
		this.positionBuffer = gl.createBuffer();
		this.normalBuffer = gl.createBuffer();
		this.texcoordBuffer = gl.createBuffer();

		this.texture = gl.createTexture();

		this.numTriangles = 0;
		this.isLightSource = isLightSource;

	}

	setMesh(vertPos, texCoords, normals) {
		gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertPos), gl.STATIC_DRAW);

		gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);

		gl.bindBuffer(gl.ARRAY_BUFFER, this.texcoordBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texCoords), gl.STATIC_DRAW);

		this.numTriangles = vertPos.length / 3;
	}


	draw(matrixMVP, matrixMV, matrixNormal, modelMatrix) {
		gl.useProgram(this.prog)

		gl.bindTexture(gl.TEXTURE_2D, this.texture);
		// Set uniform parameters
		gl.uniformMatrix4fv(this.mvpLoc, false, matrixMVP);
		gl.uniformMatrix4fv(this.mvLoc, false, matrixMV);
		gl.uniformMatrix4fv(this.mvNormalLoc, false, matrixNormal);
		gl.uniformMatrix4fv(this.modelMatrixLoc, false, modelMatrix);
		gl.uniform1i(this.isLightSourceLoc, this.isLightSource);


		// vertex positions
		gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
		gl.vertexAttribPointer(this.positionLoc, 3, gl.FLOAT, false, 0, 0);
		gl.enableVertexAttribArray(this.positionLoc);
		// // vertex normals
		gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
		gl.vertexAttribPointer(this.normalLoc, 3, gl.FLOAT, false, 0, 0);
		gl.enableVertexAttribArray(this.normalLoc);
		// // vertex texture coordinates
		gl.bindBuffer(gl.ARRAY_BUFFER, this.texcoordBuffer);
		gl.vertexAttribPointer(this.texCoordLoc, 2, gl.FLOAT,false, 0, 0);
		gl.enableVertexAttribArray(this.texCoordLoc);

		gl.drawArrays(gl.TRIANGLES, 0, this.numTriangles);

		
	}

	// This method is called to set the texture of the mesh.
	// The argument is an HTML IMG element containing the texture data.
	setTexture(img) {
		// const texture = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, this.texture);
		// You can set the texture image data using the following command.
		gl.texImage2D(
			gl.TEXTURE_2D,
			0,
			gl.RGB,
			gl.RGB,
			gl.UNSIGNED_BYTE,
			img);

		// Set texture parameters
		if (isPowerOf2(img.width) && isPowerOf2(img.height)) {
			gl.generateMipmap(gl.TEXTURE_2D);
		} else {
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		}


		gl.useProgram(this.prog);
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, this.texture);
		gl.uniform1i(this.samplerLoc, 0);

	}

}

const meshVS = `
precision mediump float;

attribute vec3 position;
attribute vec3 normal;
attribute vec2 texCoord;

uniform mat4 mvp;
uniform mat4 mv;
uniform mat4 normalMV;
uniform mat4 modelMatrix;

varying vec3 vNormal;
varying vec3 vPosition;
varying vec2 vTexCoord;
varying vec3 fragPos;

void main()
{
    vNormal = vec3(normalMV * vec4(normal, 0.0));
    vPosition = vec3(mv * vec4(position, 1.0));
	fragPos = vec3(modelMatrix * vec4(position, 1.0));
    vTexCoord = texCoord;
    gl_Position = mvp * vec4(position, 1.0);
}
`;

const meshFS = `
precision mediump float;

varying vec3 vNormal;
varying vec3 vPosition;
varying vec2 vTexCoord;
varying vec3 fragPos;

uniform sampler2D tex;
uniform bool isLightSource;

void main()
{
    // Normalize the interpolated normal
    vec3 normal = normalize(vNormal);
    
    // Light position in world space
    vec3 lightPosition = vec3(0.0, 0.0, 5.0);
    
    // Calculate light direction
    vec3 lightDirection = normalize(lightPosition - fragPos);
    
    // Base lighting components
    float ambientStrength = 0.35;
    float specularStrength = 0.3;
    float shininess = 8.0;
    
    // Calculate diffuse lighting
    float diffuseFactor = max(dot(normal, lightDirection), 0.0);
    
    // Calculate specular lighting
    vec3 viewDirection = normalize(-vPosition);
    vec3 halfwayDir = normalize(lightDirection + viewDirection);
    float specularFactor = pow(max(dot(normal, halfwayDir), 0.0), shininess);
    
    // Combine lighting components
    float lightingFactor = ambientStrength + 
                          diffuseFactor + 
                          (specularFactor * specularStrength);
    
    // Apply lighting based on whether this is a light source
    if (isLightSource) {
        gl_FragColor = texture2D(tex, vTexCoord);
    } else {
        gl_FragColor = texture2D(tex, vTexCoord) * vec4(vec3(lightingFactor), 1.0);
    }
}
`;

