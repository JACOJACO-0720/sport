import React, { useState, useRef, useEffect } from "react";
import {
  Box,
  Button,
  Typography,
  TextField,
  Slider,
  ImageList,
  ImageListItem,
  LinearProgress,
} from "@mui/material";
import * as tf from '@tensorflow/tfjs';
import * as poseDetection from '@tensorflow-models/pose-detection';

function ContentArea() {
  const [inputType, setInputType] = useState("image");
  const [file, setFile] = useState(null);
  const [videoDuration, setVideoDuration] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [frames, setFrames] = useState([]);
  const [selectedDemo, setSelectedDemo] = useState(null);
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(false);
  const [detector, setDetector] = useState(null);
  const [keypoints, setKeypoints] = useState(null);
  const [resultImage, setResultImage] = useState(null);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // 初始化姿态检测器
  useEffect(() => {
    async function initDetector() {
      // 设置后端为 'webgl'，并等待准备就绪
      await tf.setBackend('webgl');
      await tf.ready();

      const detectorConfig = {
        modelType: poseDetection.movenet.modelType.SINGLEPOSE_THUNDER,
      };
      const detector = await poseDetection.createDetector(
        poseDetection.SupportedModels.MoveNet,
        detectorConfig
      );
      setDetector(detector);
    }
    initDetector();
  }, []);

  const handleToggleInput = () => {
    setInputType(inputType === "image" ? "video" : "image");
    setFile(null);
    setFrames([]);
    setSelectedDemo(null);
    setResultImage(null);
    setKeypoints(null);
    setProgress(0);
  };

  const handleFileChange = (event) => {
    setFile(URL.createObjectURL(event.target.files[0]));
    setFrames([]);
    setSelectedDemo(null);
    setResultImage(null);
    setKeypoints(null);
    setProgress(0);
  };

  const handleVideoLoaded = () => {
    const duration = videoRef.current.duration;
    if (duration < 1) {
      alert("上传的视频必须要大于一秒");
      setFile(null);
    } else {
      setVideoDuration(duration);
    }
  };

  const handleSliderChange = (event, newValue) => {
    setStartTime(newValue);
    extractFrames(newValue);
  };

  const extractFrames = (start) => {
    const times = [start, start + 0.5, start + 1];
    const newFrames = [];

    times.forEach((time) => {
      if (time <= videoDuration) {
        captureFrame(time, (dataUrl) => {
          newFrames.push(dataUrl);
          if (newFrames.length === times.length) {
            setFrames(newFrames);
          }
        });
      }
    });
  };

  const captureFrame = (time, callback) => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    video.currentTime = time;

    video.addEventListener(
      "seeked",
      function () {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/png");
        callback(dataUrl);
      },
      { once: true }
    );
  };

  useEffect(() => {
    if (file && inputType === "video") {
      extractFrames(startTime);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file]);

  const handleDemoClick = (demoSrc) => {
    setSelectedDemo(demoSrc);
    setFile(demoSrc);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setProgress(0);
    try {
      // 第一步：提取骨骼信息
      setProgress(33);
      let imageSrc = selectedDemo || file;

      const img = new Image();
      img.crossOrigin = "anonymous"; // 避免CORS问题
      img.src = imageSrc;
      await new Promise((resolve) => {
        img.onload = resolve;
      });

      // 运行姿态检测
      const poses = await detector.estimatePoses(img);
      setKeypoints(poses[0].keypoints);

      // 提取两个手臂的6个关键点
      const requiredKeypoints = poses[0].keypoints.filter((keypoint) =>
        ["left_shoulder", "right_shoulder", "left_elbow", "right_elbow", "left_wrist", "right_wrist"].includes(keypoint.name)
      );

      // 在图像上绘制关键点
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, img.width, img.height);

      // 绘制关键点
      ctx.fillStyle = "red";
      requiredKeypoints.forEach((keypoint) => {
        if (keypoint.score > 0.3) {
          ctx.beginPath();
          ctx.arc(keypoint.x, keypoint.y, 5, 0, 2 * Math.PI);
          ctx.fill();
        }
      });

      const resultImageSrc = canvas.toDataURL('image/png');
      setResultImage(resultImageSrc);

      // 更新进度
      setProgress(66);

      // 假设还有其他处理步骤，可以在这里添加

      // 最终进度
      setProgress(100);
    } catch (error) {
      console.error(error);
      alert('处理过程中出现错误');
    }
    setLoading(false);
  };

  return (
    <Box
      sx={{
        flexGrow: 1,
        padding: 2,
        backgroundColor: "#fafafa",
        borderRadius: 1,
      }}
    >
      <Button
        variant="contained"
        onClick={handleToggleInput}
        sx={{ marginBottom: 2 }}
      >
        切换到 {inputType === "image" ? "视频" : "图片"} 输入
      </Button>

      <Box sx={{ marginBottom: 3 }}>
        {inputType === "image" ? (
          <Box>
            <Typography>请上传图片：</Typography>
            <TextField
              type="file"
              inputProps={{ accept: "image/*" }}
              fullWidth
              variant="outlined"
              onChange={handleFileChange}
            />
            {(file || selectedDemo) && (
              <Box sx={{ marginTop: 2 }}>
                <img
                  src={selectedDemo || file}
                  alt="预览"
                  style={{ maxWidth: "100%" }}
                />
              </Box>
            )}
            {/* 示例图片展示 */}
            {!file && !selectedDemo && (
              <Box sx={{ marginTop: 2 }}>
                <Typography>示例图片：</Typography>
                <ImageList cols={2}>
                  <ImageListItem onClick={() => handleDemoClick("/demo0.jpg")}>
                    <img
                      src="/demo0.jpg"
                      alt="Demo 0"
                      style={{ cursor: "pointer" }}
                    />
                  </ImageListItem>
                  <ImageListItem onClick={() => handleDemoClick("/demo1.jpg")}>
                    <img
                      src="/demo1.png"
                      alt="Demo 1"
                      style={{ cursor: "pointer" }}
                    />
                  </ImageListItem>
                </ImageList>
              </Box>
            )}
          </Box>
        ) : (
          <Box>
            <Typography>请上传视频：</Typography>
            <TextField
              type="file"
              inputProps={{ accept: "video/*" }}
              fullWidth
              variant="outlined"
              onChange={handleFileChange}
            />
            {file && (
              <Box sx={{ marginTop: 2 }}>
                <video
                  src={file}
                  ref={videoRef}
                  controls
                  onLoadedMetadata={handleVideoLoaded}
                  style={{ maxWidth: "100%" }}
                />
                {videoDuration > 0 && (
                  <Box sx={{ marginTop: 2 }}>
                    <Typography>选择1秒视频片段的起始时间（秒）：</Typography>
                    <Slider
                      value={startTime}
                      min={0}
                      max={Math.max(0, videoDuration - 1)}
                      step={0.1}
                      onChange={handleSliderChange}
                      valueLabelDisplay="auto"
                    />
                  </Box>
                )}
                <canvas ref={canvasRef} style={{ display: "none" }} />
                {frames.length > 0 && (
                  <Box sx={{ marginTop: 2 }}>
                    <Typography>截取的图片帧：</Typography>
                    <ImageList cols={3}>
                      {frames.map((frame, index) => (
                        <ImageListItem key={index}>
                          <img src={frame} alt={`Frame ${index}`} />
                        </ImageListItem>
                      ))}
                    </ImageList>
                  </Box>
                )}
              </Box>
            )}
          </Box>
        )}
      </Box>

      {/* 提交按钮 */}
      <Box sx={{ marginTop: 2 }}>
        <Button
          variant="contained"
          color="primary"
          onClick={handleSubmit}
          disabled={(!file && !selectedDemo) || loading}
        >
          {loading ? "处理中..." : "提交"}
        </Button>
      </Box>

      {/* 进度条 */}
      {loading && (
        <Box sx={{ width: '100%', marginTop: 2 }}>
          <LinearProgress variant="determinate" value={progress} />
          <Typography variant="body2" color="textSecondary">{`进度：${Math.round(progress)}%`}</Typography>
        </Box>
      )}

      <Box sx={{ marginTop: 4 }}>
        <Typography variant="h6">分析结果</Typography>
        {resultImage && (
          <Box sx={{ marginTop: 2 }}>
            <img src={resultImage} alt="结果图像" style={{ maxWidth: "100%" }} />
          </Box>
        )}
      </Box>
    </Box>
  );
}

export default ContentArea;
