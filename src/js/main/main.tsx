import { useEffect, useState, useRef } from "react";
import {
  ActionButton,
  Button,
  Divider,
  Flex,
  Footer,
  Heading,
  Item,
  Link,
  Menu,
  MenuTrigger,
  Picker,
  ProgressBar,
  Switch,
  Text,
  TextField,
  View,
} from "@adobe/react-spectrum";
import path from "path";
import { useTranslation } from 'react-i18next';
import { csi, evalTS, selectFolder } from "../lib/utils/bolt";
import { CSEvent } from "../lib/cep/csinterface";
import { fs } from "../lib/cep/node";
import ContextualHelp from "./components/CustomContextualHelp";
import LanguageButton from "./components/LanguageButton";
import './i18n/i18n';

export const BasePanel = () => {
  const [generatorState, setGeneratorState] = useState("connecting");
  const [isRecording, setIsRecording] = useState(true);
  const [language, setLanguage] = useState(localStorage["language"] || "");
  const [savePath, setSavePath] = useState(localStorage["savePath"] || "");
  const [minInterval, setMinInterval] = useState(localStorage["minInterval"] || 1);
  const [captureMode, setCaptureMode] = useState(localStorage["captureMode"] || "balanced");
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  // const [testStr, setTestStr] = useState("");
  const [inputPath, setInputPath] = useState("");
  const [outputPath, setOutputPath] = useState("");
  const [duration, setDuration] = useState(30);
  const [resolution, setResolution] = useState("1080");
  const [aspectRatio, setAspectRatio] = useState("16:9");
  const [progress, setProgress] = useState(0);
  const [isExporting, setIsExporting] = useState(false);

  // i18n
  const { t, i18n } = useTranslation();
  const AVALIABLE_LANGUAGES = ["zh", "en", "ja"];

  // Listener用到的state，使用ref得到最新值
  const generatorStateRef = useRef(generatorState);
  generatorStateRef.current = generatorState;
  const isRecordingRef = useRef(isRecording);
  isRecordingRef.current = isRecording;
  const outputPathRef = useRef(outputPath);
  outputPathRef.current = outputPath;

  function handleEventFromGenerator(event: any) {
    const attr = event.data;
    // 用于调试与generator的通信
    // setTestStr(prev => prev+JSON.stringify(attr)+"\n");
    if (generatorStateRef.current !== "connected") {
      setGeneratorState("connected");
    }

    try {
      switch (attr.action) {
        case "check":
          if (isRecordingRef.current) startRecording();
          break;

        case "exportProgress":
          setProgress(attr.progress);
          break;

        case "exportError":
          evalTS("cepAlert", t("export_error_msg") + attr.message);
          setIsExporting(false);
          break;

        case "exportComplete":
          setProgress(100);
          evalTS("cepAlert", t("export_complete_msg") + outputPathRef.current);
          openDirectory(outputPathRef.current);
          setIsExporting(false);
          break;
      }
    } catch (e) {
      evalTS("cepAlert", t("generator_event_error_msg") + e);
    }
  }

  useEffect(() => {
    // 持久化
    const makePersistent = new CSEvent(
      "com.adobe.PhotoshopPersistent",
      "APPLICATION",
      csi.getApplicationID(),
      csi.getExtensionID()
    );
    csi.dispatchEvent(makePersistent);

    if (!language) {
      if (localStorage["language"]) {
        setLanguage(localStorage["language"]);
      } else {
        var lang = csi.getHostEnvironment()?.appUILocale?.split(/[_-]/)[0]?.toLowerCase() || "zh";
        if (!AVALIABLE_LANGUAGES.includes(lang)) lang="zh";
        setLanguage(lang);
        localStorage["language"] = lang;
      }
    }
    i18n.changeLanguage(language);
    

    setTimeout(() => {
      if (generatorStateRef.current === "connecting") {
        setGeneratorState("failed");
      }
    }, 5000);
    csi.resizeContent(300, 320);

    // 监听来自Generator的事件
    csi.addEventListener("com.roscoe.ps-recorder-generator", handleEventFromGenerator);
    return () => {
      csi.removeEventListener("com.roscoe.ps-recorder-generator", handleEventFromGenerator, null);
    };
  }, []);

  function openDirectory(dir: string) {
    try {
      csi.openURLInDefaultBrowser("file://" + dir);
    } catch (e) {
      evalTS("cepAlert", t("open_directory_error_msg") + e);
    }
  }

  function selectDirectory() {
    try {
      selectFolder(savePath, t("select_directory_msg"), (res) => {
        updateSavePath(res);
      });
    } catch (e) {
      evalTS("cepAlert", t("open_directory_error_msg") + e);
    }
  }

  function exportVideo() {
    if (!inputPath) {
      evalTS("cepAlert", t("input_path_msg"));
    }
    try {
      selectFolder(savePath, t("output_path_msg"), (res) => {
        if (!res) {
          evalTS("cepAlert", t("output_path_msg"));
          return;
        }
        setOutputPath(res);
        setIsExporting(true);
        evalTS(
          "sendToGenerator",
          JSON.stringify({
            action: "export",
            inputPath: encodeURIComponent(inputPath),
            outputPath: encodeURIComponent(res),
            duration: duration,
            resolution: resolution,
            aspectRatio: aspectRatio,
          })
        );
      });
    } catch (e) {
      evalTS("cepAlert", t("export_error_msg") + e);
    }
  }

  function controlRecording(value: boolean) {
    if (value) {
      startRecording();
    } else {
      stopRecording();
    }
  }

  function startRecording() {
    setIsRecording(true);
    evalTS(
      "sendToGenerator",
      JSON.stringify({
        action: "start",
        savePath: encodeURIComponent(savePath),
        minInterval: minInterval * 1000,
        captureMode: captureMode,
      })
    );
  }

  function stopRecording() {
    setIsRecording(false);
    evalTS(
      "sendToGenerator",
      JSON.stringify({
        action: "stop",
      })
    );
  }

  const updateSavePath = (value: string) => {
    setSavePath(value);
    localStorage["savePath"] = value;
    evalTS(
      "sendToGenerator",
      JSON.stringify({
        action: "setSavePath",
        savePath: encodeURIComponent(value),
      })
    );
  };

  const updateMinInterval = (value: number) => {
    setMinInterval(value);
    localStorage["minInterval"] = value;
    evalTS(
      "sendToGenerator",
      JSON.stringify({
        action: "setMinInterval",
        minInterval: value * 1000,
      })
    );
  };

  const updateCaptureMode = (value: string) => {
    localStorage["captureMode"] = value;
    setCaptureMode(value);
    evalTS(
      "sendToGenerator",
      JSON.stringify({
        action: "setCaptureMode",
        captureMode: value,
      })
    );
  };

  const getDocumentName = async () => {
    try {
      const docName = await evalTS("getDocumentName");
      return docName?.match(/(?:.*[\\/])?([^.]*)(?:$|\..*)/)[1] || "unnamed";
    } catch (e) {
      return "";
    }
  };

  const InfoMessage = () => {
    switch (generatorState) {
      case "connecting":
        return <Text>{t("connecting")}</Text>;
      case "failed":
        return (
          <Flex alignItems="center" gap="size-100">
            <Text>{t("not_connected")}</Text>
            <ContextualHelp
              variant="help"
              heading={t("install_generator_title")}
              content={t("install_generator_help")}
            />
          </Flex>
        );
      default:
        return isRecording ? (
          <Flex alignItems="center" gap="size-100">
            <Text>{t("recording")}</Text>
            <View
              width="size-150"
              height="size-150"
              backgroundColor="static-red-600"
              borderRadius="large"
            />
          </Flex>
        ) : null;
    }
  };

  const VideoPreview = () => {
      const getLatestImage = () => {
        if (!inputPath || !fs.existsSync(inputPath)) return null;

        try {
          const images = fs
            .readdirSync(inputPath)
            .filter((file) =>
              [".jpg", ".jpeg"].includes(
                path.extname(file).toLowerCase()
              )
            )
            .sort((a, b) => {
              // 按文件名数字降序排序（文件名为时间戳）
              const numA = parseInt(
                path.basename(a, path.extname(a))
              );
              const numB = parseInt(
                path.basename(b, path.extname(b))
              );
              return numB - numA;
            });

          return images.length > 0
            ? path.join(inputPath, images[0])
            : null;
        } catch {
          return null;
        }
      };

      const calculatePreviewSize = () => {
        const baseHeight = 168;
        if (aspectRatio === "canvas") {
          return { backgroundColor: "transparent" };
        }
        const [ratioX, ratioY] = aspectRatio.split(":").map(Number);
        if (isNaN(ratioX) || isNaN(ratioY)) {
          return { backgroundColor: "transparent" };
        }
        return {
          width: `${(baseHeight * ratioX) / ratioY}px`,
          height: `${baseHeight}px`,
        };
      };

      const imagePath = getLatestImage();
      const previewStyle = calculatePreviewSize();

      return imagePath ? (
        <img
          src={imagePath}
          alt={t("input_path_msg")}
          style={{
            ...previewStyle,
            backgroundColor: "black",
            objectFit: "contain",
            maxWidth: "100%",
            maxHeight: "100%",
            opacity: isExporting ? 0.5 : 1,
          }}
        />
      ) : (
        <Flex justifyContent="center" alignItems="center" width="100%" height="100%">
          <Text>
            {inputPath ? t("no_image_msg") : t("input_path_msg")}
          </Text>
        </Flex>
      );
    }

  return (
    <View padding="size-200" flex="1">
      <Flex direction="column" gap="size-100">
        <Flex alignItems="center" justifyContent="space-between">
          <Switch 
            isSelected={isRecording}
            onChange={controlRecording}
            isDisabled={generatorState !== "connected"}
          >
            <Text>
              <b>{t("start_recording")}</b>
            </Text>
          </Switch>
          <InfoMessage />
        </Flex>
        <Flex>
          <TextField
            flex="1"
            label={t("save_path")}
            value={savePath}
            placeholder={t("save_path_msg")}
            isReadOnly
          />
        </Flex>
        <Flex gap="size-50">
          <ActionButton flex="1" onPress={selectDirectory}>
            {t("select_folder")}
          </ActionButton>
          <ActionButton
            flex="1"
            onPress={() => {
              openDirectory(savePath);
            }}
          >
            {t("open_folder")}
          </ActionButton>
        </Flex>
        <Flex gap="size-50">
          <TextField
            flex="1"
            label={t("min_interval")}
            contextualHelp={
              <ContextualHelp
                variant="help"
                heading={t("min_interval_title")}
                content={t("min_interval_help")}
              />
            }
            type="number"
            value={minInterval.toString()}
            onChange={(v) =>
              updateMinInterval(Math.min(30, Math.max(0, parseInt(v))))
            }
          />
          <Picker
            flex="1"
            label={t("capture_mode")}
            contextualHelp={
              <ContextualHelp
                variant="help"
                heading={t("capture_mode_title")}
                content={t("capture_mode_help")}
              />
            }
            selectedKey={captureMode}
            onSelectionChange={(key) => {
              updateCaptureMode(key.toString());
            }}
          >
            <Item key="balanced">{t("balanced")}</Item>
            <Item key="compressed">{t("compressed")}</Item>
            <Item key="quality">{t("quality")}</Item>
          </Picker>
        </Flex>
        <Button
          variant="cta"
          isHidden={exportDialogOpen}
          isDisabled={generatorState !== "connected"}
          marginTop="size-100"
          onPress={() => {
            getDocumentName().then((docName) => {
              setInputPath(path.join(savePath, docName).replace("\\", "/"));
              setExportDialogOpen(true);
              csi.resizeContent(300, 720);
            });
          }}
        >
          {t("export_video")}
        </Button>

        {/* <span>{testStr}</span> */}
        <Divider size="S" isHidden={!exportDialogOpen} marginTop="size-150" />

        <View isHidden={!exportDialogOpen}>
          <Heading>{t("export_video")}</Heading>
          <Flex direction="column" gap="size-200">
            <Flex gap="size-50" alignItems="end">
              <TextField
                flex={1}
                label={t("input_path")}
                value={inputPath}
                placeholder={t("input_path_msg")}
                isReadOnly
              />
              <ActionButton
                onPress={() => {
                  selectFolder(
                    inputPath,
                    t("input_path_msg"),
                    setInputPath
                  );
                }}
                isDisabled={isExporting}
              >
                {t("select")}
              </ActionButton>
            </Flex>
            <Flex
              width="100%"
              height="168px"
              position="relative"
              justifyContent="center"
            >
              <VideoPreview />
            </Flex>
            <Flex gap="size-50">
              <TextField
                flex={1}
                label={t("duration")}
                type="number"
                value={duration.toString()}
                onChange={(v) =>
                  setDuration(Math.min(3600, Math.max(1, parseInt(v))))
                }
              />
              <Picker
                flex={1}
                label={t("resolution")}
                selectedKey={resolution}
                onSelectionChange={(key) => {
                  const res = key.toString();
                  setResolution(res);
                  if (res === "canvas") {
                    setAspectRatio("canvas");
                  }
                }}
              >
                <Item key="720">720</Item>
                <Item key="1080">1080</Item>
                <Item key="2160">2160</Item>
                <Item key="canvas">{t("original")}</Item>
              </Picker>
              <Picker
                flex={1}
                label={t("aspect_ratio")}
                selectedKey={aspectRatio}
                onSelectionChange={(key) => setAspectRatio(key.toString())}
                isDisabled={resolution === "canvas"}
              >
                <Item key="16:9">16:9</Item>
                <Item key="4:3">4:3</Item>
                <Item key="1:1">1:1</Item>
                <Item key="4:5">4:5</Item>
                <Item key="9:16">9:16</Item>
                <Item key="canvas">{t("original")}</Item>
              </Picker>
            </Flex>

            <Flex gap="size-100" justifyContent="end">
              {!isExporting ? (
                <Button
                  variant="cta"
                  onPress={() => {
                    exportVideo();
                  }}
                >
                  {t("export")}
                </Button>
              ) : (
                <ProgressBar
                  label={t("progress")}
                  flex="1"
                  value={progress}
                  isIndeterminate={!progress || progress < 1}
                />
              )}
              <Button
                variant="secondary"
                onPress={() => {
                  csi.resizeContent(300, 320);
                  setExportDialogOpen(false);
                }}
              >
                {t("cancel")}
              </Button>
            </Flex>
          </Flex>
        </View>

        <Divider size="S" marginTop="size-150" />
        <Footer UNSAFE_style={{color: "gray", fontSize: "small"}}>
          <Flex justifyContent="space-between">
            <MenuTrigger>
              <LanguageButton />
              <Menu onAction={(key) => {
                const lang = key.toString();
                setLanguage(lang);
                localStorage["language"] = lang;
                i18n.changeLanguage(lang);
              }}>
                <Item key="zh">中文</Item>
                <Item key="en">English</Item>
                <Item key="ja">日本語</Item>
              </Menu>
            </MenuTrigger>
            <Flex justifyContent="end">
              <Text>PS Recorder v1.1 by RoscoeZhao</Text>
              <ContextualHelp
                variant="info"
                heading={t("about_title")}
                content={t("about_content")}
                footer={
                  <Link onPress={() => csi.openURLInDefaultBrowser("https://github.com/RoscoeZhao/PS-Recorder")}>{t("roscoe")}</Link>
                }
              />
            </Flex>
          </Flex>
        </Footer>

      </Flex>
    </View>
  );
};
