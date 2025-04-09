import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Button,
  Typography,
  TextField,
  CircularProgress,
  Paper,
  ImageList,
  ImageListItem,
  Container,
} from '@mui/material';
import * as tf from '@tensorflow/tfjs';
import * as poseDetection from '@tensorflow-models/pose-detection';
import { LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

function computeAngle(p1, p2, p3) {
  const radians = Math.atan2(p3.y - p2.y, p3.x - p2.x) - Math.atan2(p1.y - p2.y, p1.x - p2.x);
  let angle = Math.abs((radians * 180) / Math.PI);
  if (angle > 180) angle = 360 - angle;
  return angle;
}

export default function ContentArea() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [chartData, setChartData] = useState([]);
  const [landingFrames, setLandingFrames] = useState([]);

  const videoRef = useRef(null);
  const canvasRef = useRef(document.createElement('canvas'));

  useEffect(() => { tf.setBackend('webgl').then(() => tf.ready()); }, []);

  const handleFileChange = (e) => {
    setFile(URL.createObjectURL(e.target.files[0]));
    setChartData([]);
    setLandingFrames([]);
  };

  const analyzeVideo = async () => {
    setLoading(true);
    const detector = await poseDetection.createDetector(poseDetection.SupportedModels.MoveNet, {
      modelType: poseDetection.movenet.modelType.SINGLEPOSE_THUNDER,
    });

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const fps = 25;

    const positions = [], angles = [], framesImg = [];

    for (let t = 0; t < video.duration; t += 1 / fps) {
      video.currentTime = t;
      await new Promise(res => (video.onseeked = res));
      ctx.drawImage(video, 0, 0, canvas.width = video.videoWidth, canvas.height = video.videoHeight);
      const imgData = canvas.toDataURL();

      const poses = await detector.estimatePoses(canvas);
      const keypoints = poses[0]?.keypoints;

      const ankle = keypoints.find(kp => kp.name === 'left_ankle');
      positions.push({ y: ankle?.y || 0 });

      const hip = keypoints.find(kp => kp.name === 'left_hip');
      const knee = keypoints.find(kp => kp.name === 'left_knee');
      const angle = (hip && knee && ankle) ? computeAngle(hip, knee, ankle) : 0;
      angles.push(angle);

      framesImg.push(imgData);
    }

    let vel = 0, acc = 0;
    const accData = positions.map((p, i) => {
      if (i > 1) { const velPrev = vel; vel = p.y - positions[i - 1].y; acc = vel - velPrev; }
      return { frame: i, acceleration: Math.abs(acc), angle: angles[i], img: framesImg[i] };
    });

    const threshold = 15;
    const landings = accData.filter((p, i, arr) =>
      i > 0 && i < arr.length - 1 && p.acceleration > threshold &&
      p.acceleration > arr[i - 1].acceleration && p.acceleration > arr[i + 1].acceleration
    );

    setChartData(accData);
    setLandingFrames(landings);
    setLoading(false);
  };

  return (
    <Container maxWidth={false} sx={{ bgcolor: '#f7f9fc', height: '100vh', py: 4 }}>
      <Typography variant="h4" align="center" gutterBottom sx={{ mb: 4, fontWeight: 'bold' }}>
        Pose & Landing Analysis
      </Typography>

      <Paper sx={{ p: 4, mb: 4, boxShadow: 4 }}>
        <Typography variant="h6" gutterBottom>
          Upload Your Video
        </Typography>
        <TextField type="file" inputProps={{ accept: 'video/*' }} fullWidth onChange={handleFileChange} />
        {file && (
          <video ref={videoRef} src={file} controls style={{ width: '100%', marginTop: '16px', borderRadius: 4 }} />
        )}
        <Button
          variant="contained"
          onClick={analyzeVideo}
          disabled={!file || loading}
          sx={{ mt: 3, px: 4, py: 1.5 }}
        >
          {loading ? <CircularProgress size={24} /> : 'Start Analysis'}
        </Button>
      </Paper>

      {chartData.length > 0 && (
        <Paper sx={{ p: 4, boxShadow: 4 }}>
          <Typography variant="h6" gutterBottom>
            Acceleration Chart
          </Typography>
          <ResponsiveContainer height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="frame" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="acceleration" stroke="#8884d8" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>

          <Typography variant="h6" sx={{ mt: 4, mb: 2 }}>
            Detected Landing Frames
          </Typography>
          <ImageList cols={4} gap={12}>
            {landingFrames.map((f, idx) => (
              <ImageListItem key={idx}>
                <img src={f.img} alt={`Frame ${f.frame}`} style={{ borderRadius: 4 }} />
                <Typography variant="body2" align="center">
                  Frame {f.frame} - Angle: {f.angle.toFixed(1)}°
                </Typography>
              </ImageListItem>
            ))}
          </ImageList>
        </Paper>
      )}
    </Container>
  );
}