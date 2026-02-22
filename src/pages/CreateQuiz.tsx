import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import Logo from '@/components/Logo';
import AnimatedBackground from '@/components/AnimatedBackground';
import { Plus, Trash2, ChevronDown, ChevronUp, Save, ArrowLeft, Clock, CheckCircle } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';

interface Question {
  id?: string;
  question_text: string;
  option1: string;
  option2: string;
  option3: string;
  option4: string;
  correct_answer: number;
  time_limit: number;
  order_index: number;
}

const CATEGORIES = ['General', 'Science', 'History', 'Math', 'Technology', 'Sports', 'Entertainment', 'Geography', 'Literature'];

const defaultQuestion = (): Question => ({
  question_text: '',
  option1: '',
  option2: '',
  option3: '',
  option4: '',
  correct_answer: 1,
  time_limit: 30,
  order_index: 0,
});

const CreateQuiz = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('General');
  const [questions, setQuestions] = useState<Question[]>([defaultQuestion()]);
  const [expandedQ, setExpandedQ] = useState<number>(0);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) { navigate('/auth'); return; }
    if (id) loadQuiz();
  }, [user, id]);

  const loadQuiz = async () => {
    if (!id) return;
    const { data: quiz } = await supabase.from('quizzes').select('*').eq('id', id).single();
    if (quiz) {
      setTitle(quiz.title);
      setDescription(quiz.description || '');
      setCategory(quiz.category || 'General');
    }
    const { data: qs } = await supabase.from('questions').select('*').eq('quiz_id', id).order('order_index');
    if (qs && qs.length > 0) setQuestions(qs as Question[]);
  };

  const addQuestion = () => {
    const newQ = { ...defaultQuestion(), order_index: questions.length };
    setQuestions([...questions, newQ]);
    setExpandedQ(questions.length);
  };

  const removeQuestion = (i: number) => {
    const updated = questions.filter((_, idx) => idx !== i).map((q, idx) => ({ ...q, order_index: idx }));
    setQuestions(updated);
    if (expandedQ >= updated.length) setExpandedQ(Math.max(0, updated.length - 1));
  };

  const updateQuestion = (i: number, field: keyof Question, value: string | number) => {
    setQuestions(qs => qs.map((q, idx) => idx === i ? { ...q, [field]: value } : q));
  };

  const handleSave = async () => {
    setError('');
    if (!title.trim()) { setError('Quiz title is required'); return; }
    if (questions.some(q => !q.question_text.trim())) { setError('All questions need text'); return; }
    if (questions.some(q => !q.option1 || !q.option2 || !q.option3 || !q.option4)) { setError('All options are required'); return; }

    setSaving(true);
    let quizId = id;

    if (!quizId) {
      const { data, error: qErr } = await supabase
        .from('quizzes')
        .insert({ title, description, category, host_id: user!.id })
        .select()
        .single();
      if (qErr || !data) { setError('Failed to save quiz'); setSaving(false); return; }
      quizId = data.id;
    } else {
      await supabase.from('quizzes').update({ title, description, category }).eq('id', quizId);
      await supabase.from('questions').delete().eq('quiz_id', quizId);
    }

    const questionsToInsert = questions.map((q, i) => ({
      quiz_id: quizId!,
      question_text: q.question_text,
      option1: q.option1,
      option2: q.option2,
      option3: q.option3,
      option4: q.option4,
      correct_answer: q.correct_answer,
      time_limit: q.time_limit,
      order_index: i,
    }));

    const { error: qInsErr } = await supabase.from('questions').insert(questionsToInsert);
    if (qInsErr) { setError('Failed to save questions'); setSaving(false); return; }

    setSaved(true);
    setTimeout(() => { setSaved(false); navigate('/dashboard'); }, 1500);
    setSaving(false);
  };

  const optionColors = ['answer-red', 'answer-blue', 'answer-yellow', 'answer-green'];
  const optionLabels = ['A', 'B', 'C', 'D'];

  return (
    <div className="min-h-screen relative overflow-hidden">
      <AnimatedBackground />

      <div className="relative z-10 max-w-3xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8 animate-fade-in">
          <button onClick={() => navigate('/dashboard')} className="p-2 rounded-xl glass-card border border-border hover:border-neon-purple/50 text-muted-foreground hover:text-neon-purple transition-all">
            <ArrowLeft size={20} />
          </button>
          <Logo size="sm" />
          <div className="flex-1" />
          <button
            onClick={handleSave}
            disabled={saving || saved}
            className={`px-6 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-2 transition-all ${saved ? 'bg-neon-lime/20 text-neon-lime border border-neon-lime/40' : 'btn-storm text-white'
              }`}
          >
            {saved ? <><CheckCircle size={16} /> Saved!</> : saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Save size={16} /> Save Quiz</>}
          </button>
        </div>

        <h1 className="font-outfit text-3xl font-bold mb-6 animate-slide-up" style={{ background: 'var(--gradient-primary)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
          {id ? 'Edit Quiz' : 'Create New Quiz'}
        </h1>

        {/* Quiz info */}
        <div className="glass-card-solid rounded-2xl border border-border p-6 mb-6 animate-slide-up space-y-4">
          <h2 className="font-semibold text-foreground mb-4">Quiz Details</h2>
          <div>
            <label className="text-sm text-muted-foreground block mb-1.5">Quiz Title *</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Enter an exciting quiz title..."
              className="storm-input w-full px-4 py-3 text-sm"
            />
          </div>
          <div>
            <label className="text-sm text-muted-foreground block mb-1.5">Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Describe your quiz..."
              rows={3}
              className="storm-input w-full px-4 py-3 text-sm resize-none"
            />
          </div>
          <div>
            <label className="text-sm text-muted-foreground block mb-1.5">Category</label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="storm-input w-full px-4 py-3 text-sm"
            >
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        {/* Questions */}
        <div className="space-y-4 mb-6">
          {questions.map((q, i) => (
            <div
              key={i}
              className="glass-card-solid rounded-2xl border border-border overflow-hidden animate-fade-in transition-all duration-300"
              style={{ borderColor: expandedQ === i ? 'rgba(123,47,247,0.4)' : undefined }}
            >
              {/* Question header */}
              <div
                className="flex items-center gap-3 p-4 cursor-pointer hover:bg-muted/20 transition-colors"
                onClick={() => setExpandedQ(expandedQ === i ? -1 : i)}
              >
                <div className="w-8 h-8 rounded-lg gradient-bg flex items-center justify-center text-white font-outfit font-bold text-sm flex-shrink-0">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {q.question_text || `Question ${i + 1}`}
                  </p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <Clock size={10} /> {q.time_limit}s
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {questions.length > 1 && (
                    <button
                      onClick={e => { e.stopPropagation(); removeQuestion(i); }}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                  {expandedQ === i ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
                </div>
              </div>

              {/* Question body */}
              {expandedQ === i && (
                <div className="px-4 pb-4 space-y-4 border-t border-border pt-4">
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1.5">Question Text *</label>
                    <textarea
                      value={q.question_text}
                      onChange={e => updateQuestion(i, 'question_text', e.target.value)}
                      placeholder="Enter your question..."
                      rows={2}
                      className="storm-input w-full px-3 py-2.5 text-sm resize-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-muted-foreground block mb-2">Answer Options (select correct one)</label>
                    <div className="grid grid-cols-2 gap-3">
                      {[1, 2, 3, 4].map(opt => {
                        const field = `option${opt}` as keyof Question;
                        const isCorrect = q.correct_answer === opt;
                        return (
                          <div key={opt} className="relative">
                            <button
                              type="button"
                              onClick={() => updateQuestion(i, 'correct_answer', opt)}
                              className={`absolute left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all text-xs font-bold z-10 ${isCorrect ? 'bg-neon-lime border-neon-lime text-background' : 'border-border text-muted-foreground hover:border-neon-lime/50'
                                }`}
                            >
                              {optionLabels[opt - 1]}
                            </button>
                            <input
                              type="text"
                              value={q[field] as string}
                              onChange={e => updateQuestion(i, field, e.target.value)}
                              placeholder={`Option ${optionLabels[opt - 1]}`}
                              className={`storm-input w-full pl-11 pr-3 py-2.5 text-sm ${isCorrect ? 'border-neon-lime/50 bg-neon-lime/5' : ''}`}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-muted-foreground block mb-1.5">Time Limit</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min={10}
                        max={60}
                        step={5}
                        value={q.time_limit}
                        onChange={e => updateQuestion(i, 'time_limit', parseInt(e.target.value))}
                        className="flex-1 accent-neon-purple"
                      />
                      <span className="text-primary font-outfit font-bold text-sm w-12 text-right">{q.time_limit}s</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {error && (
          <div className="bg-destructive/10 border border-destructive/30 text-destructive text-sm px-4 py-3 rounded-xl mb-4">
            {error}
          </div>
        )}

        <button
          onClick={addQuestion}
          className="w-full py-4 rounded-2xl border-2 border-dashed border-neon-purple/30 text-neon-purple font-semibold text-sm hover:border-neon-purple hover:bg-[rgba(123,47,247,0.08)] transition-all duration-300 flex items-center justify-center gap-2"
        >
          <Plus size={18} /> Add Question
        </button>
      </div>
    </div>
  );
};

export default CreateQuiz;
