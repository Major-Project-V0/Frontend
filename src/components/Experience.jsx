import { Environment, OrbitControls } from "@react-three/drei";
import Avatar from "./Avatar";

export const Experience = () => {
    return (
        <>
            <OrbitControls
                enablePan={false}
                enableZoom={false}
                minPolarAngle={Math.PI / 2.2}
                maxPolarAngle={Math.PI / 2.2}
                target={[0, 1.5, 0]}
            />
            <Avatar />
            <Environment preset="sunset" />
        </>
    );
};
