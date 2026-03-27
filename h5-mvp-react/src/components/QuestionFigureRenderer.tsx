import { useEffect, useMemo, useState } from 'react';
import type { HotspotGeometry } from '../../../h5-question-content.schema';
import type { RuntimeQuestionPageViewModel, RuntimeStemBlockViewModel } from '../../../h5-runtime-adapter';
import type { RuntimeJudgeResult, RuntimeSubmissionAnswer } from '../../../h5-runtime-judge.schema';
import { getQuestionVisualMeta, resolveQuestionImagePath } from '../lib/questionVisuals';
import { getHotspotPinpointHints, getHotspotReplayConfig, type HotspotPinpointHint } from '../lib/hotspotPlayback';

interface Props {
  question: RuntimeQuestionPageViewModel;
  item: RuntimeStemBlockViewModel;
  draft?: RuntimeSubmissionAnswer;
  onChange?: (answer: RuntimeSubmissionAnswer | undefined) => void;
  reviewVisible?: boolean;
  judgeResult?: RuntimeJudgeResult;
  onPracticeAgain?: () => void;
}

export function QuestionFigureRenderer({
  question,
  item,
  draft,
  onChange,
  reviewVisible = false,
  judgeResult,
  onPracticeAgain,
}: Props) {
  const [zoomed, setZoomed] = useState(false);
  const [activeLayer, setActiveLayer] = useState<string | null>(null);
  const [replayIndex, setReplayIndex] = useState(0);
  const [replayPlaying, setReplayPlaying] = useState(false);
  const [showAnswerMask, setShowAnswerMask] = useState(true);
  const [activePinpointId, setActivePinpointId] = useState<string | null>(null);
  const meta = useMemo(() => getQuestionVisualMeta(question), [question]);
  const replayConfig = useMemo(() => getHotspotReplayConfig(question.questionId), [question.questionId]);
  const block = item.block;

  if (block.type !== 'image') return null;

  const src = item.resolvedAsset?.path ?? resolveQuestionImagePath(block.imageKey);
  const blockHotspots = question.hotspots.filter((hotspot) => hotspot.imageKey === block.imageKey);
  const layerOptions = useMemo(() => {
    const values = Array.from(
      new Set(
        blockHotspots
          .map((hotspot) => (typeof hotspot.meta?.layer === 'string' ? hotspot.meta.layer : null))
          .filter((value): value is string => !!value),
      ),
    );
    return values;
  }, [blockHotspots]);

  useEffect(() => {
    setActiveLayer(layerOptions[0] ?? null);
  }, [question.questionId, layerOptions]);

  const selectedIds = draft?.kind === 'hotspot_selection' ? draft.hotspotIds : [];
  const answerHotspotIds = question.judge.answer?.kind === 'hotspot_selection' ? question.judge.answer.hotspotIds : [];
  const isWrongReview = reviewVisible && !!judgeResult && !judgeResult.correct && answerHotspotIds.length > 0;
  const hotspotWidget = question.interaction.widget.kind === 'click_highlight' || question.interaction.widget.kind === 'click_count'
    ? question.interaction.widget
    : null;
  const supportsDirectClick = blockHotspots.length > 0 && !!onChange;
  const currentReplayStep = isWrongReview && replayConfig ? replayConfig.steps[replayIndex] : null;
  const pinpointHints = useMemo(
    () => (isWrongReview ? getHotspotPinpointHints(question, judgeResult, selectedIds) : []),
    [isWrongReview, question, judgeResult, selectedIds],
  );
  const activePinpointHint = pinpointHints.find((item) => item.id === activePinpointId) ?? null;

  useEffect(() => {
    if (!currentReplayStep?.focusLayer || activePinpointHint?.focusLayer) return;
    setActiveLayer(currentReplayStep.focusLayer);
  }, [currentReplayStep?.focusLayer, activePinpointHint?.focusLayer]);

  useEffect(() => {
    if (!isWrongReview || !replayConfig) {
      setReplayPlaying(false);
      setReplayIndex(0);
      setActivePinpointId(null);
      return;
    }
    setReplayIndex(0);
    setReplayPlaying(true);
    setShowAnswerMask(true);
    setActivePinpointId(null);
  }, [isWrongReview, replayConfig?.questionId]);

  useEffect(() => {
    if (!replayPlaying || !replayConfig || replayConfig.steps.length <= 1 || activePinpointHint) return;
    const timer = window.setInterval(() => {
      setReplayIndex((current) => (current + 1) % replayConfig.steps.length);
    }, 1800);
    return () => window.clearInterval(timer);
  }, [replayPlaying, replayConfig, activePinpointHint]);

  useEffect(() => {
    if (!activePinpointHint?.focusLayer) return;
    setActiveLayer(activePinpointHint.focusLayer);
  }, [activePinpointHint?.focusLayer]);

  const visibleHotspots =
    layerOptions.length > 1 && activeLayer
      ? blockHotspots.filter((hotspot) => hotspot.meta?.layer === activeLayer)
      : blockHotspots;
  const stageClass = `figure-stage family-${meta.family} aspect-${meta.preferredAspect ?? 'wide'}`;
  const replayFocusIds = activePinpointHint ? [] : currentReplayStep?.relatedHotspotIds ?? [];
  const pinpointFocusIds = activePinpointHint?.hotspotIds ?? [];

  return (
    <>
      <figure className={stageClass} style={{ ['--figure-accent' as string]: meta.accent }}>
        <div className="figure-toolbar">
          <div>
            <span className="figure-badge">{meta.label}</span>
            <strong className="figure-title">{block.alt ?? question.question.title}</strong>
          </div>
          <div className="figure-toolbar-actions">
            {supportsDirectClick ? (
              <span className="figure-counter">
                已点 {selectedIds.length} / {answerHotspotIds.length || blockHotspots.length}
              </span>
            ) : null}
            <button className="ghost-button" type="button" onClick={() => setZoomed(true)}>
              放大看图
            </button>
          </div>
        </div>

        {layerOptions.length > 1 ? (
          <div className="figure-layer-bar">
            {layerOptions.map((layer) => (
              <button
                key={layer}
                type="button"
                className={`figure-layer-chip ${activeLayer === layer ? 'is-active' : ''}`}
                onClick={() => {
                  setReplayPlaying(false);
                  setActivePinpointId(null);
                  setActiveLayer(layer);
                }}
              >
                {formatLayerLabel(layer)}
              </button>
            ))}
          </div>
        ) : null}

        {isWrongReview && replayConfig ? (
          <div className="replay-panel">
            <div className="replay-panel-head">
              <div>
                <div className="eyebrow">热区答案回放</div>
                <strong>{replayConfig.intro}</strong>
              </div>
              <div className="replay-panel-actions">
                <button className="ghost-button" type="button" onClick={() => setShowAnswerMask((value) => !value)}>
                  {showAnswerMask ? '隐藏答案底图' : '显示答案底图'}
                </button>
                <button className="ghost-button" type="button" onClick={() => setReplayPlaying((value) => !value)}>
                  {replayPlaying ? '暂停闪示' : '自动闪示'}
                </button>
                {onPracticeAgain ? (
                  <button className="primary-button" type="button" onClick={onPracticeAgain}>
                    回放后再练一遍
                  </button>
                ) : null}
              </div>
            </div>
            <div className="replay-step-row">
              {replayConfig.steps.map((step, index) => (
                <button
                  key={step.id}
                  type="button"
                  className={`replay-step-chip ${index === replayIndex && !activePinpointHint ? 'is-active' : ''}`}
                  onClick={() => {
                    setReplayPlaying(false);
                    setActivePinpointId(null);
                    setReplayIndex(index);
                  }}
                >
                  {index + 1}. {step.title}
                </button>
              ))}
            </div>
            {currentReplayStep ? (
              <div className="replay-step-card">
                <strong>{currentReplayStep.title}</strong>
                <p>{currentReplayStep.text}</p>
              </div>
            ) : null}

            {pinpointHints.length ? (
              <div className="pinpoint-panel">
                <div className="pinpoint-panel-head">
                  <div>
                    <div className="eyebrow">错因定点提示</div>
                    <strong>把错因直接定位到图上的具体位置</strong>
                  </div>
                  {activePinpointHint ? (
                    <button className="ghost-button" type="button" onClick={() => setActivePinpointId(null)}>
                      回到回放步骤
                    </button>
                  ) : null}
                </div>
                <div className="pinpoint-chip-row">
                  {pinpointHints.map((hint) => (
                    <button
                      key={hint.id}
                      type="button"
                      className={`pinpoint-chip tone-${hint.tone} ${activePinpointId === hint.id ? 'is-active' : ''}`}
                      onClick={() => {
                        setReplayPlaying(false);
                        setActivePinpointId(hint.id);
                      }}
                    >
                      {hint.title}
                    </button>
                  ))}
                </div>
                {activePinpointHint ? <PinpointCard hint={activePinpointHint} /> : null}
              </div>
            ) : null}
          </div>
        ) : null}

        <FigureCanvas
          src={src}
          alt={block.alt ?? question.question.title}
          hotspots={visibleHotspots}
          selectedIds={selectedIds}
          answerHotspotIds={answerHotspotIds}
          replayFocusIds={replayFocusIds}
          pinpointFocusIds={pinpointFocusIds}
          supportsDirectClick={supportsDirectClick}
          reviewVisible={isWrongReview}
          showAnswerMask={showAnswerMask}
          onHotspotClick={(hotspotId) => {
            if (!supportsDirectClick || isWrongReview) return;
            onChange?.({
              kind: 'hotspot_selection',
              hotspotIds: toggleHotspotId(selectedIds, hotspotId, hotspotWidget?.maxSelectable),
            });
          }}
        />

        <div className="figure-hints">
          {meta.hints.map((hint) => (
            <span key={hint} className="figure-hint-chip">
              {hint}
            </span>
          ))}
          {supportsDirectClick ? <span className="figure-hint-chip is-accent">支持图上直接点选作答</span> : null}
          {isWrongReview ? <span className="figure-hint-chip is-accent">已进入错题回放模式</span> : null}
          {activePinpointHint ? <span className="figure-hint-chip is-warning">当前定位：{activePinpointHint.title}</span> : null}
        </div>
      </figure>

      {zoomed && (
        <div className="image-modal-backdrop" role="presentation" onClick={() => setZoomed(false)}>
          <div className="image-modal-card" role="dialog" aria-modal="true" onClick={(event: { stopPropagation: () => void }) => event.stopPropagation()}>
            <div className="image-modal-head">
              <div>
                <div className="eyebrow">{meta.label}</div>
                <h3>{block.alt ?? question.question.title}</h3>
              </div>
              <button className="ghost-button" type="button" onClick={() => setZoomed(false)}>
                关闭
              </button>
            </div>
            <div className="image-modal-body is-figure-modal">
              <div className="image-modal-figure-wrap">
                <FigureCanvas
                  src={src}
                  alt={block.alt ?? question.question.title}
                  hotspots={visibleHotspots}
                  selectedIds={selectedIds}
                  answerHotspotIds={answerHotspotIds}
                  replayFocusIds={replayFocusIds}
                  pinpointFocusIds={pinpointFocusIds}
                  supportsDirectClick={false}
                  reviewVisible={isWrongReview}
                  showAnswerMask={showAnswerMask}
                />
              </div>
            </div>
            <div className="image-modal-hints">
              {meta.hints.map((hint) => (
                <span key={hint} className="figure-hint-chip">
                  {hint}
                </span>
              ))}
              {currentReplayStep && !activePinpointHint ? <span className="figure-hint-chip is-accent">当前回放：{currentReplayStep.title}</span> : null}
              {activePinpointHint ? <span className="figure-hint-chip is-warning">当前定位：{activePinpointHint.title}</span> : null}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function FigureCanvas({
  src,
  alt,
  hotspots,
  selectedIds,
  answerHotspotIds,
  replayFocusIds,
  pinpointFocusIds,
  supportsDirectClick,
  reviewVisible,
  showAnswerMask,
  onHotspotClick,
}: {
  src: string;
  alt: string;
  hotspots: RuntimeQuestionPageViewModel['hotspots'];
  selectedIds: string[];
  answerHotspotIds: string[];
  replayFocusIds: string[];
  pinpointFocusIds: string[];
  supportsDirectClick: boolean;
  reviewVisible: boolean;
  showAnswerMask: boolean;
  onHotspotClick?: (hotspotId: string) => void;
}) {
  return (
    <div className={`figure-canvas-wrap ${supportsDirectClick ? 'is-interactive' : ''} ${reviewVisible ? 'is-reviewing' : ''}`}>
      <div className="figure-canvas-grid" aria-hidden="true" />
      <img className="figure-image" src={src} alt={alt} loading="lazy" />
      {hotspots.length > 0 ? (
        <svg className="figure-hotspot-svg" viewBox="0 0 1 1" preserveAspectRatio="none">
          {hotspots.map((hotspot) => {
            const selected = selectedIds.includes(hotspot.id);
            const inAnswer = answerHotspotIds.includes(hotspot.id);
            const inReplay = replayFocusIds.includes(hotspot.id);
            const inPinpoint = pinpointFocusIds.includes(hotspot.id);
            return (
              <g
                key={hotspot.id}
                className={getHotspotGroupClass({
                  hotspot,
                  selected,
                  inAnswer,
                  inReplay,
                  inPinpoint,
                  reviewVisible,
                  showAnswerMask,
                })}
                onClick={(event: { stopPropagation: () => void }) => {
                  if (!supportsDirectClick) return;
                  event.stopPropagation();
                  onHotspotClick?.(hotspot.id);
                }}
              >
                {renderHotspotShape(hotspot.geometry)}
                {shouldRenderHotspotLabel(hotspot) ? renderHotspotLabel(hotspot.geometry, getHotspotLabel(hotspot)) : null}
              </g>
            );
          })}
        </svg>
      ) : null}
    </div>
  );
}

function PinpointCard({ hint }: { hint: HotspotPinpointHint }) {
  return (
    <div className={`pinpoint-card tone-${hint.tone}`}>
      <strong>{hint.title}</strong>
      <p>{hint.text}</p>
      <div className="pinpoint-card-meta">已定位 {hint.hotspotIds.length} 处重点位置</div>
    </div>
  );
}

function formatLayerLabel(layer: string): string {
  return layer.replace('x', ' × ');
}

function toggleHotspotId(selectedIds: string[], hotspotId: string, maxSelectable?: number): string[] {
  if (selectedIds.includes(hotspotId)) {
    return selectedIds.filter((item) => item !== hotspotId);
  }
  if (maxSelectable && selectedIds.length >= maxSelectable) {
    return selectedIds;
  }
  return [...selectedIds, hotspotId];
}

function renderHotspotShape(geometry: HotspotGeometry) {
  if (geometry.shape === 'circle') {
    return <circle className="hotspot-shape" cx={geometry.cx} cy={geometry.cy} r={geometry.r} />;
  }
  if (geometry.shape === 'rect') {
    return <rect className="hotspot-shape" x={geometry.x} y={geometry.y} width={geometry.width} height={geometry.height} rx={0.01} />;
  }
  return <polygon className="hotspot-shape" points={geometry.points.map((point) => `${point.x},${point.y}`).join(' ')} />;
}

function renderHotspotLabel(geometry: HotspotGeometry, label: string) {
  const center = getHotspotCenter(geometry);
  return (
    <text className="hotspot-label" x={center.x} y={center.y} textAnchor="middle" dominantBaseline="middle">
      {label}
    </text>
  );
}

function getHotspotCenter(geometry: HotspotGeometry): { x: number; y: number } {
  if (geometry.shape === 'circle') {
    return { x: geometry.cx, y: geometry.cy };
  }
  if (geometry.shape === 'rect') {
    return { x: geometry.x + geometry.width / 2, y: geometry.y + geometry.height / 2 };
  }
  const xs = geometry.points.map((point) => point.x);
  const ys = geometry.points.map((point) => point.y);
  return {
    x: xs.reduce((sum, value) => sum + value, 0) / xs.length,
    y: ys.reduce((sum, value) => sum + value, 0) / ys.length,
  };
}

function shouldRenderHotspotLabel(hotspot: RuntimeQuestionPageViewModel['hotspots'][number]): boolean {
  const style = String(hotspot.meta?.displayStyle ?? '');
  return style === 'ghost-cube' || style === 'tile-gap';
}

function getHotspotLabel(hotspot: RuntimeQuestionPageViewModel['hotspots'][number]): string {
  const style = String(hotspot.meta?.displayStyle ?? '');
  if (style === 'ghost-cube') return '?';
  if (style === 'tile-gap') return '补';
  return hotspot.label;
}

function getHotspotGroupClass({
  hotspot,
  selected,
  inAnswer,
  inReplay,
  inPinpoint,
  reviewVisible,
  showAnswerMask,
}: {
  hotspot: RuntimeQuestionPageViewModel['hotspots'][number];
  selected: boolean;
  inAnswer: boolean;
  inReplay: boolean;
  inPinpoint: boolean;
  reviewVisible: boolean;
  showAnswerMask: boolean;
}): string {
  const classes = ['hotspot-group', `style-${String(hotspot.meta?.displayStyle ?? 'default')}`];
  if (selected) classes.push('is-active');
  if (!reviewVisible) return classes.join(' ');
  if (selected && !inAnswer) classes.push('is-wrong-selected');
  if (showAnswerMask && inAnswer) classes.push('is-answer');
  if (inReplay) classes.push('is-replay-focus');
  if (inPinpoint) classes.push('is-pinpoint-focus');
  if (reviewVisible && !inReplay && !inPinpoint && showAnswerMask) classes.push('is-review-dim');
  return classes.join(' ');
}
