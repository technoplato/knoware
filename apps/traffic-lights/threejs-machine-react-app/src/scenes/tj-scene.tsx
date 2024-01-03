import { Canvas, ThreeElements, useFrame } from '@react-three/fiber';
import { useMachine } from '@xstate/react';
import { useRef, useState } from 'react';
import * as THREE from 'three';
import { machine } from './bc-scene/copy-tj/traffic-light.machine';

const useTrafficLightController = () => {
  const [snapshot, send, actor] = useMachine(machine);

  const red = 0xff4013;
  const yellow = 0xfffb00;
  const green = 0x77bb41;

  const colorMap = {
    red,
    yellow,
    green,
  } as const;

  const handleLightSelected = (lightPosition: 'top' | 'middle' | 'bottom') => {
    send({ type: 'light clicked', lightPosition });
  };

  return {
    colors: ['red', 'yellow', 'green'].map((color) => {
      return snapshot.context.color.toLowerCase() === color
        ? colorMap[color]
        : 'silver';
    }),
    handleLightSelected,
  };
};

function TrafficLight(props: ThreeElements['mesh']) {
  const { colors, handleLightSelected } = useTrafficLightController();
  const [top, middle, bottom] = colors;

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
      <Sphere
        position={[0, 2, 0.5]}
        color={top}
        handleClick={() => handleLightSelected('top')}
      />
      <Sphere
        position={[0, 0, 0.5]}
        color={middle}
        handleClick={() => handleLightSelected('middle')}
      />
      <Sphere
        position={[0, -2, 0.5]}
        color={bottom}
        handleClick={() => handleLightSelected('bottom')}
      />
    </mesh>
  );
}

type SphereProps = ThreeElements['mesh'] & {
  color?: number; // Optional color prop
  handleClick: () => void;
};

function Sphere({ color = 0x049ef4, handleClick, ...props }: SphereProps) {
  const ref = useRef<THREE.Mesh>(null!);
  // const [hovered, hover] = useState(false);
  const [clicked, click] = useState(false);
  // ref.current.rotation.x += 0.01;
  // This is used to rotate the cube every frame
  // useFrame((state, delta) => (ref.current.rotation.y += delta));

  return (
    <mesh
      {...props}
      ref={ref}
      // scale={hovered ? 1.5 : 1}
      onClick={handleClick}
      // onPointerOver={(event) => hover(true)}
      // onPointerOut={(event) => hover(false)}
    >
      <sphereGeometry args={[0.8, 32, 16]} />
      <meshPhysicalMaterial color={color} emissive={0x000000} />
    </mesh>
  );
}

function Box(props: ThreeElements['mesh']) {
  const ref = useRef<THREE.Mesh>(null!);
  // const [hovered, hover] = useState(false);
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
      // onPointerOver={(event) => hover(true)}
      // onPointerOut={(event) => hover(false)}
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
