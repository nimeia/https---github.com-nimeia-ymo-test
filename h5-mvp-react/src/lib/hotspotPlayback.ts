import type { RuntimeQuestionPageViewModel } from '../../../h5-runtime-adapter';
import type { RuntimeJudgeResult } from '../../../h5-runtime-judge.schema';

export interface HotspotReplayStep {
  id: string;
  title: string;
  text: string;
  relatedHotspotIds: string[];
  focusLayer?: string;
}

export interface HotspotReplayConfig {
  questionId: string;
  intro: string;
  steps: HotspotReplayStep[];
}

export interface HotspotPinpointHint {
  id: string;
  title: string;
  text: string;
  hotspotIds: string[];
  tone: 'missed' | 'extra';
  focusLayer?: string;
}

const HOTSPOT_REPLAY_CONFIGS: Record<string, HotspotReplayConfig> = {
  '36Y-4': {
    questionId: '36Y-4',
    intro: '按从上到下的层次去数，每点亮一层就能避免重复。',
    steps: [
      {
        id: '36Y-4-r1',
        title: '先点中间 6 个灰点',
        text: '先把中间最明显的一小层圈出来，建立计数起点。',
        relatedHotspotIds: ['36Y-4-hs-1', '36Y-4-hs-2', '36Y-4-hs-3', '36Y-4-hs-4', '36Y-4-hs-5', '36Y-4-hs-6'],
      },
      {
        id: '36Y-4-r2',
        title: '再点第二层 12 个灰点',
        text: '中间两侧对称展开，第二层一共 12 个。',
        relatedHotspotIds: ['36Y-4-hs-7', '36Y-4-hs-8', '36Y-4-hs-9', '36Y-4-hs-10', '36Y-4-hs-11', '36Y-4-hs-12', '36Y-4-hs-13', '36Y-4-hs-14', '36Y-4-hs-15', '36Y-4-hs-16', '36Y-4-hs-17', '36Y-4-hs-18'],
      },
      {
        id: '36Y-4-r3',
        title: '最后点最外层 12 个灰点',
        text: '最外圈继续按左右对称点亮，6 + 12 + 12 = 30。',
        relatedHotspotIds: ['36Y-4-hs-19', '36Y-4-hs-20', '36Y-4-hs-21', '36Y-4-hs-22', '36Y-4-hs-23', '36Y-4-hs-24', '36Y-4-hs-25', '36Y-4-hs-26', '36Y-4-hs-27', '36Y-4-hs-28', '36Y-4-hs-29', '36Y-4-hs-30'],
      },
    ],
  },
  '36Y-10': {
    questionId: '36Y-10',
    intro: '数正方形时先切最小层，再逐层切到更大的正方形。',
    steps: [
      {
        id: '36Y-10-r1',
        title: '先数 1×1 正方形',
        text: '最小方格最容易看清，先把 1×1 这一层全部点完。',
        relatedHotspotIds: Array.from({ length: 20 }, (_, index) => `36Y-10-hs-${index + 1}`),
        focusLayer: '1x1',
      },
      {
        id: '36Y-10-r2',
        title: '再数 2×2 正方形',
        text: '换到 2×2 层，沿着横向和纵向平移去数。',
        relatedHotspotIds: Array.from({ length: 12 }, (_, index) => `36Y-10-hs-${index + 21}`),
        focusLayer: '2x2',
      },
      {
        id: '36Y-10-r3',
        title: '继续数 3×3 正方形',
        text: '大一层的正方形数量更少，要防止漏掉边上的大框。',
        relatedHotspotIds: Array.from({ length: 6 }, (_, index) => `36Y-10-hs-${index + 33}`),
        focusLayer: '3x3',
      },
      {
        id: '36Y-10-r4',
        title: '最后数 4×4 正方形',
        text: '最大的正方形只剩 2 个，全部加起来得到 40。',
        relatedHotspotIds: ['36Y-10-hs-39', '36Y-10-hs-40'],
        focusLayer: '4x4',
      },
    ],
  },
  '34W-19': {
    questionId: '34W-19',
    intro: '补砖题先找所有缺口，再去数每个缺口里该补的砖。',
    steps: [
      {
        id: '34W-19-r1',
        title: '先找顶部缺口',
        text: '顶部有三段缺口，先把最上面一条带状空位全部找出来。',
        relatedHotspotIds: ['34W-19-hs-1', '34W-19-hs-2', '34W-19-hs-3'],
      },
      {
        id: '34W-19-r2',
        title: '再找中部和左下缺口',
        text: '中部横条、中间竖条和左下角也都属于需要补砖的位置。',
        relatedHotspotIds: ['34W-19-hs-4', '34W-19-hs-5', '34W-19-hs-6'],
      },
    ],
  },
  '36Y-16': {
    questionId: '36Y-16',
    intro: '遮挡题先看前排，再推后面被挡住的位置。',
    steps: [
      {
        id: '36Y-16-r1',
        title: '先确认前排支撑关系',
        text: '前排已经露出的方块说明后排一定有支撑，不能悬空。',
        relatedHotspotIds: ['36Y-16-hs-1'],
      },
      {
        id: '36Y-16-r2',
        title: '再补出第二个被挡住的位置',
        text: '继续沿同一层往右推，被挡住的第二块也必须存在。',
        relatedHotspotIds: ['36Y-16-hs-2'],
      },
    ],
  },
};

export function getHotspotReplayConfig(questionId: string): HotspotReplayConfig | null {
  return HOTSPOT_REPLAY_CONFIGS[questionId] ?? null;
}

export function hasHotspotReplay(question: RuntimeQuestionPageViewModel): boolean {
  return !!getHotspotReplayConfig(question.questionId) && question.hotspots.length > 0;
}

export function getHotspotPinpointHints(
  question: RuntimeQuestionPageViewModel,
  judgeResult?: RuntimeJudgeResult,
  selectedIds: string[] = [],
): HotspotPinpointHint[] {
  const answer = question.judge.answer;
  if (!judgeResult || judgeResult.correct || answer?.kind !== 'hotspot_selection') {
    return [];
  }

  const hotspotMap = new Map(question.hotspots.map((hotspot) => [hotspot.id, hotspot]));
  const selectedSet = new Set(selectedIds);
  const answerSet = new Set(answer.hotspotIds);
  const missedIds = answer.hotspotIds.filter((id) => !selectedSet.has(id));
  const extraIds = selectedIds.filter((id) => !answerSet.has(id));
  const replayConfig = getHotspotReplayConfig(question.questionId);
  const hints: HotspotPinpointHint[] = [];

  if (missedIds.length > 0) {
    if (replayConfig) {
      replayConfig.steps.forEach((step) => {
        const related = step.relatedHotspotIds.filter((id) => missedIds.includes(id));
        if (!related.length) return;
        hints.push({
          id: `missed-${step.id}`,
          title: `漏点：${step.title}`,
          text: `这一层还有 ${related.length} 个位置没点到。先盯住这些位置，再重新数一遍。`,
          hotspotIds: related,
          tone: 'missed',
          focusLayer: step.focusLayer,
        });
      });
    }
    if (!hints.some((item) => item.tone === 'missed')) {
      hints.push(...buildGroupedHints(missedIds, hotspotMap, 'missed'));
    }
  }

  if (extraIds.length > 0) {
    hints.push(...buildGroupedHints(extraIds, hotspotMap, 'extra'));
  }

  return hints;
}

function buildGroupedHints(
  hotspotIds: string[],
  hotspotMap: Map<string, RuntimeQuestionPageViewModel['hotspots'][number]>,
  tone: 'missed' | 'extra',
): HotspotPinpointHint[] {
  const grouped = new Map<string, string[]>();

  hotspotIds.forEach((id) => {
    const hotspot = hotspotMap.get(id);
    const groupKey = getHotspotGroupKey(hotspot);
    const current = grouped.get(groupKey) ?? [];
    current.push(id);
    grouped.set(groupKey, current);
  });

  return Array.from(grouped.entries()).map(([groupKey, ids], index) => ({
    id: `${tone}-${groupKey}-${index}`,
    title: tone === 'missed' ? `漏点：${formatGroupTitle(groupKey, hotspotMap, ids)}` : `误点：${formatGroupTitle(groupKey, hotspotMap, ids)}`,
    text:
      tone === 'missed'
        ? `这 ${ids.length} 个位置属于正确答案，但本次没有点到。优先补看：${summarizeHotspotNames(ids, hotspotMap)}。`
        : `这 ${ids.length} 个位置不属于正确答案。下次先排除：${summarizeHotspotNames(ids, hotspotMap)}。`,
    hotspotIds: ids,
    tone,
    focusLayer: getFocusLayerForGroup(groupKey),
  }));
}

function getHotspotGroupKey(hotspot?: RuntimeQuestionPageViewModel['hotspots'][number]): string {
  if (!hotspot) return '未命名区域';
  const meta = hotspot.meta ?? {};
  if (typeof meta.layer === 'string' && meta.layer) return `layer:${meta.layer}`;
  if (typeof meta.zone === 'string' && meta.zone) return `zone:${meta.zone}`;
  if (typeof meta.displayStyle === 'string' && meta.displayStyle) return `style:${meta.displayStyle}`;
  return `label:${hotspot.label}`;
}

function formatGroupTitle(
  groupKey: string,
  hotspotMap: Map<string, RuntimeQuestionPageViewModel['hotspots'][number]>,
  ids: string[],
): string {
  const [kind, value] = groupKey.split(':');
  if (kind === 'layer' && value) return `${value.replace('x', ' × ')} 这一层`;
  if (kind === 'zone' && value) return value.replace(/-/g, ' ');
  if (kind === 'style' && value === 'ghost-cube') return '被挡住的方块位置';
  if (kind === 'style' && value === 'tile-gap') return '缺口区域';
  return hotspotMap.get(ids[0])?.label ?? '目标区域';
}

function summarizeHotspotNames(
  ids: string[],
  hotspotMap: Map<string, RuntimeQuestionPageViewModel['hotspots'][number]>,
): string {
  return ids
    .slice(0, 3)
    .map((id) => hotspotMap.get(id)?.label ?? id)
    .join('、') + (ids.length > 3 ? ' 等' : '');
}

function getFocusLayerForGroup(groupKey: string): string | undefined {
  const [kind, value] = groupKey.split(':');
  return kind === 'layer' ? value : undefined;
}
