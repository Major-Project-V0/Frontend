import React, { useEffect, useMemo, useRef, useState } from "react";
import { useGLTF, useAnimations } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const corresponding = {
    A: "pp",
    B: "kk",
    C: "ih",
    D: "AA",
    E: "oh",
    F: "ou",
    G: "FF",
    H: "TH",
    X: "sil",
};

const Avatar = (props) => {
    const { nodes, materials, animations } = useGLTF("/rain_v3.2.glb");
    const { actions } = useAnimations(animations, nodes.Scene || nodes['RIG-rain']);

    const [isPlaying, setIsPlaying] = useState(false);
    const audioRef = useRef(null);
    const analyserRef = useRef(null);
    const dataArrayRef = useRef(null);
    const audioContextRef = useRef(null);
    const headMeshRef = useRef(null);

    // Wawa Style Discrete State
    const currentViseme = useRef("X");
    const morphTargetSmoothing = 0.15;

    // Discovery Logic
    useEffect(() => {
        Object.values(nodes).forEach(node => {
            if (node.type === 'SkinnedMesh' && node.morphTargetDictionary) {
                if ('sil' in node.morphTargetDictionary || 'pp' in node.morphTargetDictionary) {
                    console.log("Found Head Mesh:", node.name);
                    headMeshRef.current = node;
                }
            }
        });

        // Basic Idle
        if (actions) {
            const idleAction = actions['Rain_Head_Lower'] || Object.values(actions)[0];
            if (idleAction) {
                idleAction.reset().fadeIn(0.5).play();
                idleAction.setEffectiveWeight(0.1); // Subtle movement
            }
        }
    }, [nodes, actions]);

    useEffect(() => {
        const handleSpeakText = async (event) => {
            const { text } = event.detail;
            if (!text) return;

            try {
                const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
                const resp = await fetch(`${API_BASE_URL}/api/gemini/tts/?text=${encodeURIComponent(text)}`);
                if (!resp.ok) throw new Error("TTS Failed");

                const blob = await resp.blob();
                const url = URL.createObjectURL(blob);
                const audio = new Audio(url);
                audioRef.current = audio;

                const AudioContextClass = window.AudioContext || window.webkitAudioContext;
                if (!audioContextRef.current) audioContextRef.current = new AudioContextClass();
                const ctx = audioContextRef.current;
                if (ctx.state === 'suspended') await ctx.resume();

                const source = ctx.createMediaElementSource(audio);
                const analyser = ctx.createAnalyser();
                analyser.fftSize = 256;
                source.connect(analyser);
                analyser.connect(ctx.destination);

                analyserRef.current = analyser;
                dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount);

                audio.onplay = () => {
                    setIsPlaying(true);
                    window.dispatchEvent(new CustomEvent("avatar-speaking-start"));
                };

                audio.onended = () => {
                    setIsPlaying(false);
                    currentViseme.current = "X";
                    window.dispatchEvent(new CustomEvent("avatar-speaking-end"));
                };

                await audio.play();
            } catch (err) {
                console.error("LIPSYNC_ERROR:", err);
                setIsPlaying(false);
                window.dispatchEvent(new CustomEvent("avatar-speaking-end"));
            }
        };

        window.addEventListener("speak-text", handleSpeakText);
        return () => {
            window.removeEventListener("speak-text", handleSpeakText);
            if (audioRef.current) audioRef.current.pause();
        };
    }, []);

    useFrame((state) => {
        const headMesh = headMeshRef.current;
        if (!headMesh || !headMesh.morphTargetInfluences) return;

        const influences = headMesh.morphTargetInfluences;
        const dict = headMesh.morphTargetDictionary;

        // 1. RE-CALCULATE CURRENT VISEME STATE
        if (isPlaying && analyserRef.current && dataArrayRef.current) {
            analyserRef.current.getByteFrequencyData(dataArrayRef.current);
            const data = dataArrayRef.current;
            const binCount = data.length;

            const getBand = (low, high) => {
                let sum = 0; let count = 0;
                for (let i = Math.floor(binCount * low); i < Math.floor(binCount * high); i++) {
                    sum += data[i]; count++;
                }
                return sum / (count || 1);
            };

            const bL = getBand(0, 0.2);
            const bM = getBand(0.2, 0.5);
            const bH = getBand(0.5, 0.8);

            const maxVal = Math.max(bL, bM, bH);
            const threshold = 15;

            if (maxVal > threshold) {
                if (bL > bM && bL > bH) {
                    if (bL > 60) currentViseme.current = "D";
                    else if (bL > 30) currentViseme.current = "E";
                    else currentViseme.current = "A";
                } else if (bM > bH) {
                    currentViseme.current = "C";
                } else {
                    currentViseme.current = "H";
                }
            } else {
                currentViseme.current = "X";
            }
        }

        // 2. CLEARING LOOP
        Object.values(corresponding).forEach((value) => {
            const idx = dict[value];
            if (idx !== undefined) {
                influences[idx] = THREE.MathUtils.lerp(influences[idx], 0, morphTargetSmoothing);
            }
        });

        // 3. APPLY ACTIVE VISEME
        const activeMorph = corresponding[currentViseme.current];
        if (activeMorph && dict[activeMorph] !== undefined) {
            influences[dict[activeMorph]] = THREE.MathUtils.lerp(influences[dict[activeMorph]], 1, 0.25);
        }

        // Blink
        const blinkIdx = dict['EyelidsClose.L'];
        if (blinkIdx !== undefined) {
            const blink = (state.clock.elapsedTime % 4.5) > 4.3 ? 1 : 0;
            influences[blinkIdx] = THREE.MathUtils.lerp(influences[blinkIdx], blink, 0.5);
            if (dict['EyelidsClose.R'] !== undefined) influences[dict['EyelidsClose.R']] = influences[blinkIdx];
        }
    });

    return (
        <group {...props} dispose={null} scale={0.8} position={[0, -1.2, 0]}>
            <primitive object={nodes.Scene || nodes.root || nodes['RIG-rain']} />
        </group>
    );
};

useGLTF.preload("/rain_v3.2.glb");

export default Avatar;
