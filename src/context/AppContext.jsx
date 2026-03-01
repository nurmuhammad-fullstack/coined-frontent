import { createContext, useContext, useState, useEffect } from "react";
import { authAPI, studentsAPI, shopAPI, quizzesAPI } from "../services/api";

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [currentUser, setCurrentUser]   = useState(null);
  const [students, setStudents]         = useState([]);
  const [shopItems, setShopItems]       = useState([]);
  const [transactions, setTransactions] = useState({});
  const [quizzes, setQuizzes]           = useState([]);
  const [quizAttempts, setQuizAttempts] = useState([]);
  const [quizzesLoaded, setQuizzesLoaded] = useState(false); // ✅ yuklandi flag
  const [toast, setToast]               = useState(null);
  const [loading, setLoading]           = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("coined_token");
    if (token) {
      authAPI.me()
        .then(user => setCurrentUser(user))
        .catch(() => localStorage.removeItem("coined_token"))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (currentUser?.role === "teacher") {
      studentsAPI.getAll().then(setStudents).catch(console.error);
      shopAPI.getAll().then(setShopItems).catch(console.error);
      quizzesAPI.getAll().then(setQuizzes).catch(console.error);
    }

    if (currentUser?.role === "student") {
      shopAPI.getAll().then(setShopItems).catch(console.error);
      setQuizzesLoaded(false); // yuklanishni boshladi

      quizzesAPI.getAll().then(data => {
        setQuizzes(data);

        // ✅ Faqat backend dan — _id si bor attempt larni oladi
        const serverAttempts = data
          .filter(q => q.attempt && q.attempt._id)
          .map(q => ({
            ...q.attempt,
            quiz:      q._id || q.id,
            quizId:    q._id || q.id,
            student:   currentUser._id,
            studentId: currentUser._id,
          }));

        setQuizAttempts(serverAttempts);
        setQuizzesLoaded(true); // ✅ yuklandi
      }).catch(console.error);
    }
  }, [currentUser]);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2800);
  };

  const login = async (email, password) => {
    const data = await authAPI.login(email, password);
    localStorage.setItem("coined_token", data.token);
    setCurrentUser(data.user);
    return { ok: true, role: data.user.role };
  };

  const logout = () => {
    localStorage.removeItem("coined_token");
    setCurrentUser(null);
    setStudents([]);
    setShopItems([]);
    setTransactions({});
    setQuizzes([]);
    setQuizAttempts([]);
    setQuizzesLoaded(false);
  };

  const createStudent = async (data) => {
    const res = await authAPI.createStudent(data);
    setStudents(prev => [...prev, res.user || res]);
    return res;
  };

  const deleteStudent = async (studentId) => {
    await studentsAPI.deleteOne(studentId);
    setStudents(prev => prev.filter(s => s._id !== studentId));
  };

  const addCoins = async (studentId, amount, label = "Teacher Bonus") => {
    const res = await studentsAPI.addCoins(studentId, amount, label, "behavior");
    setStudents(prev => prev.map(s => s._id === studentId ? { ...s, coins: res.student.coins } : s));
    setTransactions(prev => ({
      ...prev,
      [studentId]: [{ _id: Date.now(), label, type: "earn", amount, date: "Just now" }, ...(prev[studentId] || [])]
    }));
  };

  const removeCoins = async (studentId, amount, label = "Teacher Deduction") => {
    const res = await studentsAPI.removeCoins(studentId, amount, label, "behavior");
    setStudents(prev => prev.map(s => s._id === studentId ? { ...s, coins: res.student.coins } : s));
    setTransactions(prev => ({
      ...prev,
      [studentId]: [{ _id: Date.now(), label, type: "spend", amount: -amount, date: "Just now" }, ...(prev[studentId] || [])]
    }));
  };

  const spendCoins = async (userId, amount, itemName) => {
    try {
      await studentsAPI.removeCoins(userId, amount, itemName, "shop");
      setCurrentUser(prev => ({ ...prev, coins: (prev.coins || 0) - amount }));
      return true;
    } catch {
      return false;
    }
  };

  const loadTransactions = async (studentId) => {
    try {
      const txs = await studentsAPI.getTransactions(studentId);
      setTransactions(prev => ({ ...prev, [studentId]: txs }));
    } catch (err) {
      console.error(err);
    }
  };

  const getStudentCoins = (id) => {
    const s = students.find(s => s._id === id);
    if (s) return s.coins || 0;
    if (currentUser?._id === id) return currentUser.coins || 0;
    return 0;
  };

  const getStudentTransactions = (id) => transactions[id] || [];

  const addShopItem = async (item) => {
    const res = await shopAPI.addItem(item);
    setShopItems(prev => [...prev, res]);
  };

  const removeShopItem = async (id) => {
    await shopAPI.deleteItem(id);
    setShopItems(prev => prev.filter(i => i._id !== id && i.id !== id));
  };

  const createQuiz = async (data) => {
    const res = await quizzesAPI.create(data);
    setQuizzes(prev => [...prev, res]);
    return res;
  };

  const updateQuiz = async (id, data) => {
    const res = await quizzesAPI.update(id, data);
    setQuizzes(prev => prev.map(q => (q._id || q.id) === id ? res : q));
    return res;
  };

  const deleteQuiz = async (id) => {
    await quizzesAPI.delete(id);
    setQuizzes(prev => prev.filter(q => (q._id || q.id) !== id));
  };

  const submitQuizAttempt = async (quizId, answers) => {
    const formattedAnswers = answers.map(a => ({
      questionIndex: a.questionIndex,
      selected: a.selectedOption ?? a.selected,
    }));

    const res = await quizzesAPI.submitAttempt(quizId, formattedAnswers);

    // ✅ Yangi attempt ni state ga qo'sh
    const newAttempt = {
      ...(res.attempt || {}),
      _id:       res.attempt?._id || Date.now().toString(),
      quiz:      quizId,
      quizId:    quizId,
      student:   currentUser._id,
      studentId: currentUser._id,
      score:     res.score,
      coinsEarned: res.coinsEarned,
    };

    setQuizAttempts(prev => [...prev, newAttempt]);

    // ✅ quizzes state ni ham yangilaymiz — quiz.attempt ni to'ldiramiz
    setQuizzes(prev => prev.map(q =>
      (q._id || q.id) === quizId ? { ...q, attempt: newAttempt } : q
    ));

    if (res.coinsEarned) {
      setCurrentUser(prev => ({ ...prev, coins: (prev.coins || 0) + res.coinsEarned }));
    }

    return {
      score:          res.score,
      coinsEarned:    res.coinsEarned,
      correctCount:   res.correct,
      totalQuestions: res.total,
    };
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center bg-slate-50 min-h-screen">
        <div className="text-center">
          <div className="mb-3 text-5xl animate-bounce">🪙</div>
          <p className="font-bold text-slate-500">Loading CoinEd...</p>
        </div>
      </div>
    );
  }

  return (
    <AppContext.Provider value={{
      currentUser, login, logout,
      students, setStudents,
      shopItems, setShopItems,
      transactions,
      addCoins, removeCoins, spendCoins,
      addShopItem, removeShopItem,
      createStudent, deleteStudent,
      loadTransactions,
      getStudentCoins, getStudentTransactions,
      quizzes, setQuizzes,
      quizAttempts, setQuizAttempts,
      quizzesLoaded,                          // ✅ export qilamiz
      createQuiz, updateQuiz, deleteQuiz,
      submitQuizAttempt,
      toast, showToast,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);