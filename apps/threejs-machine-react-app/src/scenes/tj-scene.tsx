import { Canvas, ThreeElements, useFrame } from '@react-three/fiber';
import { useRef, useState } from 'react';
import * as THREE from 'three';

function TrafficLight(props: ThreeElements['mesh']) {
  const ref = useRef<THREE.Mesh>(null!);
  //   const [hovered, hover] = useState(false);
  //   const [clicked, click] = useState(false);
  // ref.current.rotation.x += 0.01;
  // This is used to rotate the cube every frame
  useFrame((state, delta) => (ref.current.rotation.y += delta));

  return (
    <mesh
      {...props}
      ref={ref}
      scale={1}
      //   onClick={(event) => click(!clicked)}
      //   onPointerOver={(event) => hover(true)}
      //   onPointerOut={(event) => hover(false)}
    >
      <Box position={[0, 0, 0]} />
      <Sphere position={[0, 2, 0.5]} color={0xff4013} />
      <Sphere position={[0, 0, 0.5]} color={0xfffb00} />
      <Sphere position={[0, -2, 0.5]} color={0x77bb41} />
    </mesh>
  );
}

type SphereProps = ThreeElements['mesh'] & {
  color?: number; // Optional color prop
};

function Sphere({ color = 0x049ef4, ...props }: SphereProps) {
  const ref = useRef<THREE.Mesh>(null!);
  const [hovered, hover] = useState(false);
  const [clicked, click] = useState(false);
  // ref.current.rotation.x += 0.01;
  // This is used to rotate the cube every frame
  // useFrame((state, delta) => (ref.current.rotation.y += delta));

  return (
    <mesh
      {...props}
      ref={ref}
      scale={hovered ? 1.5 : 1}
      onClick={(event) => click(!clicked)}
      onPointerOver={(event) => hover(true)}
      onPointerOut={(event) => hover(false)}
    >
      <sphereGeometry args={[0.8, 32, 16]} />
      <meshPhysicalMaterial color={color} emissive={0x000000} />
    </mesh>
  );
}

function Box(props: ThreeElements['mesh']) {
  const ref = useRef<THREE.Mesh>(null!);
  const [hovered, hover] = useState(false);
  const [clicked, click] = useState(false);
  // ref.current.rotation.x += 0.01;
  // This is used to rotate the cube every frame
  //   useFrame((state, delta) => (ref.current.rotation.y += delta));

  return (
    <mesh
      {...props}
      ref={ref}
      scale={1}
      onClick={(event) => click(!clicked)}
      onPointerOver={(event) => hover(true)}
      onPointerOut={(event) => hover(false)}
    >
      <boxGeometry args={[2, 8, 1]} />
      <meshPhysicalMaterial
        color={0x444444}
        // ior={1.5}
        // // specularColor={0xffffff}
        // reflectivity={0.5}
        // specularIntensity={1}
        // metalness={0}
        // clearcoat={0.5}
      />
    </mesh>
  );
}

export function TjScene() {
  return (
    <Canvas>
      <ambientLight />
      <directionalLight position={[5, 5, 3]} intensity={1} />
      <TrafficLight />
      {/* <Box position={[0, 0, 0]} /> */}
      {/* <Sphere position={[0, 2, 0]} />
      <Sphere position={[0, 0, 0]} />
      <Sphere position={[0, -2, 0]} /> */}
    </Canvas>
  );
}
