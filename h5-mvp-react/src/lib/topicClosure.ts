import type { QuestionRecord } from '../../../h5-question-bank.types';

export interface RetryQueueEntry {
  questionId: string;
  addedAtMs: number;
  source: 'judge_wrong' | 'manual' | 'wrong_book';
  seedQuestionId?: string;
}

export interface SimilarQuestionCandidate {
  questionId: string;
  score: number;
  reason: string;
}

function interactionOverlapScore(base: QuestionRecord, candidate: QuestionRecord): number {
  const set = new Set(base.interaction);
  let overlap = 0;
  candidate.interaction.forEach((item) => {
    if (set.has(item)) overlap += 1;
  });
  return overlap * 6;
}

function difficultyClosenessScore(base: QuestionRecord, candidate: QuestionRecord): number {
  const delta = Math.abs(base.difficulty - candidate.difficulty);
  return Math.max(0, 8 - delta * 2);
}

export function rankSimilarQuestions(
  seedQuestionId: string,
  questionIndex: Record<string, QuestionRecord>,
  excludedIds: string[] = [],
): SimilarQuestionCandidate[] {
  const seed = questionIndex[seedQuestionId];
  if (!seed) return [];

  const excluded = new Set([seedQuestionId, ...excludedIds]);

  return Object.values(questionIndex)
    .filter((candidate) => !excluded.has(candidate.id))
    .map((candidate) => {
      let score = 0;
      const reasons: string[] = [];

      if (candidate.subtypeKey === seed.subtypeKey) {
        score += 100;
        reasons.push('同子题型');
      }
      if (candidate.moduleId === seed.moduleId) {
        score += 30;
        reasons.push('同模块');
      }
      if (candidate.paper === seed.paper) {
        score += 8;
        reasons.push('同试卷来源');
      }

      const interactionScore = interactionOverlapScore(seed, candidate);
      if (interactionScore > 0) {
        score += interactionScore;
        reasons.push('交互接近');
      }

      const difficultyScore = difficultyClosenessScore(seed, candidate);
      if (difficultyScore > 0) {
        score += difficultyScore;
        reasons.push('难度接近');
      }

      if (candidate.skills.some((skill) => seed.skills.includes(skill))) {
        score += 12;
        reasons.push('技能相近');
      }

      return {
        questionId: candidate.id,
        score,
        reason: reasons.join(' / ') || '同专题练习',
      } satisfies SimilarQuestionCandidate;
    })
    .sort((a, b) => b.score - a.score || a.questionId.localeCompare(b.questionId));
}

export function buildSimilarPracticeTitle(seed: QuestionRecord, candidate?: QuestionRecord): string {
  if (!candidate) return `同类加练 · ${seed.subtype}`;
  return `同类加练 · ${seed.subtype} · ${candidate.paperMeta.name}`;
}

export function upsertRetryQueue(
  queue: RetryQueueEntry[],
  entry: RetryQueueEntry,
): RetryQueueEntry[] {
  if (queue.some((item) => item.questionId === entry.questionId)) return queue;
  return [...queue, entry];
}

export function removeRetryQueueItem(queue: RetryQueueEntry[], questionId: string): RetryQueueEntry[] {
  return queue.filter((item) => item.questionId !== questionId);
}

export function buildQueuePracticeQuestionIds(queue: RetryQueueEntry[]): string[] {
  return queue.map((item) => item.questionId);
}

export function buildQueueWithSimilarQuestionIds(
  queue: RetryQueueEntry[],
  questionIndex: Record<string, QuestionRecord>,
  usedQuestionIds: string[] = [],
): string[] {
  const result: string[] = [];
  const used = new Set<string>(usedQuestionIds);

  queue.forEach((entry) => {
    if (!used.has(entry.questionId)) {
      result.push(entry.questionId);
      used.add(entry.questionId);
    }

    const similar = rankSimilarQuestions(entry.questionId, questionIndex, Array.from(used))[0];
    if (similar && !used.has(similar.questionId)) {
      result.push(similar.questionId);
      used.add(similar.questionId);
    }
  });

  return result;
}
