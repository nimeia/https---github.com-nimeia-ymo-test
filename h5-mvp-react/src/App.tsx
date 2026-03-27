import { useEffect, useMemo, useState } from 'react';
import type { RuntimeSubmissionAnswer } from '../../h5-runtime-judge.schema';
import type { HomePageData, ModuleId, ModuleLobbyData, PaperInfo, RoomCardViewModel, WrongBookEntry } from '../../h5-question-bank.types';
import { mockHomePageData, mockModuleLobbyMap } from '../../h5-question-bank.mock';
import { fullQuestionBankConfig } from '../../h5-question-bank.full';
import {
  featuredFullRuntimeQuestionIds,
  fullRuntimeQuestionIds,
  fullRuntimeQuestionIdsByModule,
  fullRuntimeQuestionsByPaper,
} from '../../h5-runtime-adapter.full';
import { QuestionFigureRenderer } from './components/QuestionFigureRenderer';
import { QuestionInteractionPanel } from './components/QuestionInteractionPanel';
import { useRuntimeMachineDemo, type SessionPlan } from './hooks/useRuntimeMachineDemo';

type ScreenRoute =
  | { name: 'home' }
  | { name: 'module'; moduleId: ModuleId }
  | { name: 'play' }
  | { name: 'result' }
  | { name: 'wrongbook' };

const PAPER_ORDER = ['34Y', '35Y', '36Y', '34W'] as const;

export default function App() {
  const [route, setRoute] = useState<ScreenRoute>({ name: 'home' });
  const [plan, setPlan] = useState<SessionPlan | null>(null);
  const runtime = useRuntimeMachineDemo(plan);

  useEffect(() => {
    if (route.name === 'play' && runtime.state?.phase === 'completed') {
      setRoute({ name: 'result' });
    }
  }, [route.name, runtime.state?.phase]);

  const quickStartSets = useMemo(
    () => [
      {
        key: 'full-80',
        title: '全量 80 题完整闯关',
        description: '已接到全量结构化题包，可直接从第 1 题一路玩到第 80 题。',
        questionIds: fullRuntimeQuestionIds,
      },
      {
        key: 'featured-10',
        title: '精选 10 题首发体验',
        description: '先用 10 道代表题快速体验快算、规律、图形、空间与逻辑。',
        questionIds: featuredFullRuntimeQuestionIds,
      },
      ...mockHomePageData.quickStartSets.map((item) => ({
        key: item.key,
        title: item.title,
        description: item.description,
        questionIds: item.questionIds,
      })),
    ],
    [],
  );

  const papers = useMemo(
    () => PAPER_ORDER.map((code) => fullQuestionBankConfig.papers.find((item) => item.code === code)).filter(Boolean) as PaperInfo[],
    [],
  );

  const openPlan = (nextPlan: SessionPlan) => {
    setPlan(nextPlan);
    setRoute({ name: 'play' });
  };

  const header = (
    <header className="app-header">
      <div>
        <div className="eyebrow">H5 MVP Full Build</div>
        <h1>一年级思维训练大屏</h1>
        <p>已接通：80 题正式题包 → runtime adapter → 判题 → 状态机 → 本地存档 → 结果页 / 错题本。</p>
      </div>
      <div className="top-actions">
        <button className="ghost-button" type="button" onClick={() => setRoute({ name: 'home' })}>
          首页
        </button>
        <button
          className="primary-button"
          type="button"
          onClick={() =>
            openPlan({
              machineId: 'featured-10',
              title: '精选 10 题首发体验',
              questionIds: featuredFullRuntimeQuestionIds,
            })
          }
        >
          直接试玩
        </button>
      </div>
    </header>
  );

  return (
    <div className="app-shell">
      {header}
      {route.name === 'home' && (
        <HomeScreen
          homeData={mockHomePageData}
          quickStartSets={quickStartSets}
          papers={papers}
          onOpenModule={(moduleId) => setRoute({ name: 'module', moduleId })}
          onOpenQuickStart={(key, title, questionIds) => openPlan({ machineId: key, title, questionIds })}
          onOpenPaper={(paper) =>
            openPlan({
              machineId: `paper-${paper.code}`,
              title: paper.name,
              questionIds: fullRuntimeQuestionsByPaper[paper.code] ?? [],
            })
          }
        />
      )}
      {route.name === 'module' && (() => {
        const moduleId = route.moduleId as ModuleId;
        return (
          <ModuleScreen
            module={mockModuleLobbyMap[moduleId]}
            roomCard={mockHomePageData.roomCards.find((item) => item.moduleId === moduleId)}
            questionCount={fullRuntimeQuestionIdsByModule[moduleId].length}
            onBack={() => setRoute({ name: 'home' })}
            onStart={() =>
              openPlan({
                machineId: `module-${moduleId}`,
                title: `${mockModuleLobbyMap[moduleId].roomName} · ${mockModuleLobbyMap[moduleId].moduleName}`,
                questionIds: fullRuntimeQuestionIdsByModule[moduleId],
              })
            }
          />
        );
      })()}
      {route.name === 'play' && runtime.state && (
        <PlayScreen
          title={plan?.title ?? '混合挑战'}
          state={runtime.state}
          onEmit={runtime.emit}
          onRestart={runtime.restart}
          onShowResult={() => setRoute({ name: 'result' })}
          onBackHome={() => setRoute({ name: 'home' })}
          onClearSnapshot={runtime.clearSnapshot}
        />
      )}
      {route.name === 'result' && runtime.state?.session.resultPage && (
        <ResultScreen
          result={runtime.state.session.resultPage}
          onBackHome={() => setRoute({ name: 'home' })}
          onOpenWrongBook={() => setRoute({ name: 'wrongbook' })}
          onRetry={() => {
            runtime.restart();
            setRoute({ name: 'play' });
          }}
        />
      )}
      {route.name === 'wrongbook' && runtime.state?.session.wrongBook && (
        <WrongBookScreen
          wrongBook={runtime.state.session.wrongBook}
          onBackHome={() => setRoute({ name: 'home' })}
          onBackResult={() => setRoute({ name: 'result' })}
        />
      )}
    </div>
  );
}

function HomeScreen({
  homeData,
  quickStartSets,
  papers,
  onOpenModule,
  onOpenQuickStart,
  onOpenPaper,
}: {
  homeData: HomePageData;
  quickStartSets: Array<{ key: string; title: string; description: string; questionIds: string[] }>;
  papers: PaperInfo[];
  onOpenModule: (moduleId: ModuleId) => void;
  onOpenQuickStart: (key: string, title: string, questionIds: string[]) => void;
  onOpenPaper: (paper: PaperInfo) => void;
}) {
  return (
    <main className="page-grid">
      <section className="hero-card">
        <div className="eyebrow">{homeData.appTitle}</div>
        <h2>首个完整可玩 MVP</h2>
        <p>当前已接入 4 份试卷共 80 题，可按模块、按试卷、按快启挑战直接开始训练。</p>
        <div className="hero-actions wrap-actions">
          {quickStartSets.slice(0, 3).map((item) => (
            <button
              key={item.key}
              className="primary-button"
              type="button"
              onClick={() => onOpenQuickStart(item.key, item.title, item.questionIds)}
            >
              {item.title}
            </button>
          ))}
        </div>
      </section>

      <section className="panel-card">
        <div className="section-head">
          <h3>快速开始</h3>
          <span className="tag">{fullRuntimeQuestionIds.length} 题已接通</span>
        </div>
        <div className="summary-table quick-grid">
          {quickStartSets.map((item) => (
            <button
              key={item.key}
              type="button"
              className="summary-row quick-row"
              onClick={() => onOpenQuickStart(item.key, item.title, item.questionIds)}
            >
              <span>{item.title}</span>
              <span>{item.description}</span>
              <span>{item.questionIds.length} 题</span>
            </button>
          ))}
        </div>
      </section>

      <section className="panel-card">
        <div className="section-head">
          <h3>按试卷开始</h3>
          <span className="tag">4 套原始来源</span>
        </div>
        <div className="paper-grid">
          {papers.map((paper) => (
            <article key={paper.code} className="paper-card">
              <div>
                <div className="eyebrow">{paper.org}</div>
                <h4>{paper.name}</h4>
                <p>
                  {paper.grade} · {paper.stage}
                </p>
              </div>
              <button className="ghost-button" type="button" onClick={() => onOpenPaper(paper)}>
                开始 {fullRuntimeQuestionsByPaper[paper.code]?.length ?? 0} 题
              </button>
            </article>
          ))}
        </div>
      </section>

      <section className="room-grid">
        {homeData.roomCards.map((room) => (
          <article key={room.moduleId} className="room-card">
            <div className="room-top">
              <span className="room-badge">P{room.priority}</span>
              <span className="room-count">{fullRuntimeQuestionIdsByModule[room.moduleId].length} 题</span>
            </div>
            <h3>{room.roomName}</h3>
            <p className="room-title">{room.title}</p>
            <p className="room-subtitle">{room.subtitle}</p>
            <div className="tag-row">
              {room.featuredSkills.map((skill) => (
                <span className="tag" key={skill}>
                  {skill}
                </span>
              ))}
            </div>
            <button className="ghost-button" type="button" onClick={() => onOpenModule(room.moduleId)}>
              进入房间
            </button>
          </article>
        ))}
      </section>
    </main>
  );
}

function ModuleScreen({
  module,
  roomCard,
  questionCount,
  onBack,
  onStart,
}: {
  module: ModuleLobbyData;
  roomCard?: RoomCardViewModel;
  questionCount: number;
  onBack: () => void;
  onStart: () => void;
}) {
  return (
    <main className="page-grid">
      <section className="hero-card">
        <div className="eyebrow">{module.roomName}</div>
        <h2>{module.moduleName}</h2>
        <p>推荐交互：{module.allowedInteractions.join(' / ') || '待配置'}</p>
        <div className="hero-actions">
          <button className="ghost-button" type="button" onClick={onBack}>
            返回首页
          </button>
          <button className="primary-button" type="button" onClick={onStart} disabled={!questionCount}>
            {questionCount ? `开始本房间（${questionCount} 题）` : '当前模块待录题'}
          </button>
        </div>
      </section>

      <section className="two-col-grid">
        <article className="panel-card">
          <h3>子题型</h3>
          <div className="tag-row">
            {module.subtypeBadges.map((item) => (
              <span key={item.key} className="tag">
                {item.name} · {item.count}
              </span>
            ))}
          </div>
        </article>
        <article className="panel-card">
          <h3>房间概览</h3>
          <p>已接入正式题数：{questionCount}</p>
          <p>推荐模式：{module.recommendedModes.join(' / ') || 'topic_campaign'}</p>
          <p>代表技能：{roomCard?.featuredSkills.join(' / ') ?? '待补充'}</p>
        </article>
      </section>
    </main>
  );
}

function PlayScreen({
  title,
  state,
  onEmit,
  onRestart,
  onShowResult,
  onBackHome,
  onClearSnapshot,
}: {
  title: string;
  state: NonNullable<ReturnType<typeof useRuntimeMachineDemo>['state']>;
  onEmit: ReturnType<typeof useRuntimeMachineDemo>['emit'];
  onRestart: () => void;
  onShowResult: () => void;
  onBackHome: () => void;
  onClearSnapshot: () => void;
}) {
  const currentQuestion = state.currentQuestion;
  const currentQuestionState = state.currentQuestionState;
  const draft = state.currentQuestionId ? state.draftByQuestionId[state.currentQuestionId]?.answer : undefined;
  const timer = currentQuestionState?.timer;
  const remainingSeconds = timer?.remainingMs ? Math.max(0, Math.ceil(timer.remainingMs / 1000)) : undefined;
  const latestJudgeResult = currentQuestionState?.latestJudgeResult ?? state.lastJudgeResult;
  const canPracticeAgain = !!currentQuestion && !!latestJudgeResult && !latestJudgeResult.correct && state.reviewVisible && currentQuestion.hotspots.length > 0;

  const handlePracticeAgain = () => {
    if (!currentQuestion) return;
    onEmit('CHANGE_DRAFT', {
      questionId: currentQuestion.questionId,
      answer: undefined,
      meta: { dirty: false, touched: true, source: 'system' },
    });
  };

  return (
    <main className="play-layout">
      <section className="play-main">
        <div className="panel-card sticky-top">
          <div className="play-headline">
            <div>
              <div className="eyebrow">{title}</div>
              <h2>{currentQuestion?.question.title ?? '暂无题目'}</h2>
            </div>
            <div className="stat-row">
              <StatPill label="进度" value={`${state.navigation.currentIndex}/${state.navigation.total}`} />
              <StatPill label="连击" value={String(state.session.totals.currentCombo)} />
              <StatPill label="星级" value={String(state.session.totals.totalStars)} />
              <StatPill label="剩余" value={remainingSeconds !== undefined ? `${remainingSeconds}s` : '-'} />
            </div>
          </div>

          {state.feedbackBanner?.visible && (
            <div className={`banner tone-${state.feedbackBanner.tone}`}>
              <strong>{state.feedbackBanner.title}</strong>
              <span>{state.feedbackBanner.text}</span>
            </div>
          )}

          {currentQuestion && (
            <>
              <StemBlocks
                question={currentQuestion}
                draft={draft}
                reviewVisible={state.reviewVisible}
                judgeResult={latestJudgeResult}
                onPracticeAgain={canPracticeAgain ? handlePracticeAgain : undefined}
                onDraftChange={(answer) =>
                  onEmit('CHANGE_DRAFT', {
                    questionId: currentQuestion.questionId,
                    answer,
                    meta: { dirty: true, touched: true, source: 'pointer' },
                  })
                }
              />
              <QuestionInteractionPanel
                widget={currentQuestion.interaction.widget}
                draft={draft}
                hotspotCount={currentQuestion.hotspots.length || undefined}
                onChange={(answer) =>
                  onEmit('CHANGE_DRAFT', {
                    questionId: currentQuestion.questionId,
                    answer,
                    meta: { dirty: true, touched: true, source: 'pointer' },
                  })
                }
              />
            </>
          )}

          <div className="action-row wrap-actions">
            <button
              className="ghost-button"
              type="button"
              onClick={() => onEmit(state.phase === 'paused' ? 'RESUME_SESSION' : 'PAUSE_SESSION', {})}
            >
              {state.phase === 'paused' ? '继续' : '暂停'}
            </button>
            <button className="ghost-button" type="button" onClick={() => onEmit('GO_TO_PREVIOUS_QUESTION', { autoStart: true })}>
              上一题
            </button>
            <button className="primary-button" type="button" onClick={() => onEmit('SUBMIT_CURRENT_QUESTION', {})}>
              提交判题
            </button>
            <button className="ghost-button" type="button" onClick={() => onEmit('OPEN_REVIEW', {})}>
              看解析
            </button>
            {canPracticeAgain ? (
              <button className="primary-button subtle" type="button" onClick={handlePracticeAgain}>
                回放后再练一遍
              </button>
            ) : null}
            <button className="ghost-button" type="button" onClick={() => onEmit('GO_TO_NEXT_QUESTION', { autoStart: true })}>
              下一题
            </button>
            <button className="ghost-button" type="button" onClick={onShowResult}>
              去结算
            </button>
          </div>
        </div>
      </section>

      <aside className="play-side">
        <article className="panel-card">
          <h3>会话控制</h3>
          <div className="side-actions">
            <button className="ghost-button" type="button" onClick={onRestart}>
              重开本轮
            </button>
            <button className="ghost-button" type="button" onClick={onClearSnapshot}>
              清空快照
            </button>
            <button className="ghost-button" type="button" onClick={onBackHome}>
              返回首页
            </button>
          </div>
        </article>

        <article className="panel-card">
          <h3>题目元信息</h3>
          <ul className="meta-list">
            <li>Phase：{state.phase}</li>
            <li>Session：{state.session.sessionId}</li>
            <li>Machine：{state.machineId}</li>
            <li>模块：{currentQuestion?.question.moduleName}</li>
            <li>交互：{currentQuestion?.question.primaryInteraction}</li>
            <li>Preset：{currentQuestion?.scene.presetKey}</li>
          </ul>
        </article>

        <article className="panel-card">
          <h3>解析区</h3>
          {currentQuestion ? (
            <>
              <p className="review-title">{currentQuestion.review.explanation.summary}</p>
              <div className={`review-status-banner ${state.reviewVisible ? 'is-open' : ''}`}>
                {state.reviewVisible
                  ? canPracticeAgain
                    ? '当前已打开解析；可先看错因定点提示，再点“回放后再练一遍”重新作答。'
                    : '当前已打开解析；图形题会在题图区逐步闪示答案。'
                  : '点击“看解析”后，会进入图上答案回放。'}
              </div>
              <ul className="review-step-list">
                {currentQuestion.review.explanation.steps.map((step, index) => (
                  <li key={step.id}>
                    <strong>{index + 1}. {step.title}</strong>
                    <p>{step.text}</p>
                  </li>
                ))}
              </ul>
              {latestJudgeResult && !latestJudgeResult.correct && latestJudgeResult.feedback.length ? (
                <div className="review-feedback-box">
                  <strong>本次错因提示</strong>
                  <ul className="meta-list compact">
                    {latestJudgeResult.feedback.map((item) => (
                      <li key={`${item.code}-${item.title}`}>{item.title}：{item.text}</li>
                    ))}
                  </ul>
                  {canPracticeAgain ? (
                    <button className="primary-button subtle" type="button" onClick={handlePracticeAgain}>
                      看完提示，马上重练这题
                    </button>
                  ) : null}
                </div>
              ) : null}
            </>
          ) : (
            <p>暂无解析</p>
          )}
        </article>
      </aside>
    </main>
  );
}

function ResultScreen({
  result,
  onRetry,
  onOpenWrongBook,
  onBackHome,
}: {
  result: NonNullable<NonNullable<ReturnType<typeof useRuntimeMachineDemo>['state']>['session']['resultPage']>;
  onRetry: () => void;
  onOpenWrongBook: () => void;
  onBackHome: () => void;
}) {
  return (
    <main className="page-grid">
      <section className="hero-card">
        <div className="eyebrow">结算页</div>
        <h2>本轮完成</h2>
        <div className="stat-row wrap-actions">
          <StatPill label="总题数" value={String(result.total)} />
          <StatPill label="正确" value={String(result.correct)} />
          <StatPill label="准确率" value={`${Math.round(result.accuracy * 100)}%`} />
          <StatPill label="总星级" value={String(result.totalStars)} />
          <StatPill label="总耗时" value={`${result.totalSeconds}s`} />
        </div>
        <div className="hero-actions">
          <button className="primary-button" type="button" onClick={onRetry}>
            再来一轮
          </button>
          <button className="ghost-button" type="button" onClick={onOpenWrongBook}>
            查看错题本
          </button>
          <button className="ghost-button" type="button" onClick={onBackHome}>
            返回首页
          </button>
        </div>
      </section>

      <section className="panel-card">
        <h3>逐题结果</h3>
        <div className="summary-table">
          {result.questionSummaries.map((item) => (
            <div key={item.questionId} className="summary-row">
              <span>{item.questionId}</span>
              <span>{item.title}</span>
              <span>{item.correct ? '正确' : '错误'}</span>
              <span>{item.timeSpentSeconds}s</span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

function WrongBookScreen({
  wrongBook,
  onBackHome,
  onBackResult,
}: {
  wrongBook: NonNullable<NonNullable<ReturnType<typeof useRuntimeMachineDemo>['state']>['session']['wrongBook']>;
  onBackHome: () => void;
  onBackResult: () => void;
}) {
  const groups = Object.entries(wrongBook.groupedByModule) as Array<[ModuleId, WrongBookEntry[]]>;
  return (
    <main className="page-grid">
      <section className="hero-card">
        <div className="eyebrow">错题本</div>
        <h2>今日推荐重练 {wrongBook.totalWrongQuestions} 题</h2>
        <div className="hero-actions">
          <button className="ghost-button" type="button" onClick={onBackResult}>
            返回结算页
          </button>
          <button className="ghost-button" type="button" onClick={onBackHome}>
            返回首页
          </button>
        </div>
      </section>

      <section className="two-col-grid">
        {groups.map(([moduleId, entries]) => (
          <article key={moduleId} className="panel-card">
            <h3>模块 {moduleId}</h3>
            {entries.length ? (
              <ul className="meta-list">
                {entries.map((entry) => (
                  <li key={entry.questionId}>
                    {entry.questionId} · {entry.title} · 错 {entry.wrongCount} 次
                  </li>
                ))}
              </ul>
            ) : (
              <p>当前模块没有错题。</p>
            )}
          </article>
        ))}
      </section>
    </main>
  );
}

function StemBlocks({
  question,
  draft,
  reviewVisible,
  judgeResult,
  onDraftChange,
  onPracticeAgain,
}: {
  question: NonNullable<NonNullable<ReturnType<typeof useRuntimeMachineDemo>['state']>['currentQuestion']>;
  draft?: RuntimeSubmissionAnswer;
  reviewVisible?: boolean;
  judgeResult?: NonNullable<NonNullable<ReturnType<typeof useRuntimeMachineDemo>['state']>['lastJudgeResult']>;
  onDraftChange: (answer: RuntimeSubmissionAnswer | undefined) => void;
  onPracticeAgain?: () => void;
}) {
  return (
    <div className="stem-blocks">
      {question.stem.map((item) => {
        const block = item.block;
        if (block.type === 'image') {
          return (
            <QuestionFigureRenderer
              key={block.id}
              question={question}
              item={item}
              draft={draft}
              reviewVisible={reviewVisible}
              judgeResult={judgeResult}
              onPracticeAgain={onPracticeAgain}
              onChange={onDraftChange}
            />
          );
        }

        if (block.type === 'grid') {
          return (
            <div key={block.id} className="resource-box grid-preview-box">
              <strong>题面网格 {block.rows}×{block.cols}</strong>
              <div className="mini-grid" style={{ gridTemplateColumns: `repeat(${block.cols}, minmax(24px, 1fr))` }}>
                {block.cells.map((cell) => (
                  <span key={cell.cellId} className={`mini-grid-cell ${cell.locked ? 'is-locked' : ''}`}>
                    {cell.presetValue ?? ''}
                  </span>
                ))}
              </div>
            </div>
          );
        }

        if (block.type === 'number_line') {
          return (
            <div key={block.id} className="resource-box">
              <strong>数轴</strong>
              <span>
                {block.min} - {block.max}
              </span>
            </div>
          );
        }

        return (
          <div key={block.id} className={`text-block text-${block.type}`}>
            {block.text}
          </div>
        );
      })}
    </div>
  );
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat-pill">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
