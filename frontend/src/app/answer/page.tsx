"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function AnswerPage() {
  const params = useSearchParams();
  const startIndex = parseInt(params.get("start") || "0");
  const [currentIndex, setCurrentIndex] = useState(startIndex); // ✅ 默认从 startIndex 开始
  const router = useRouter();
  const questionList = params.getAll("question");
  // const [currentIndex, setCurrentIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const sessionId = typeof window !== "undefined" ? localStorage.getItem("session_id") : null;

  const currentQuestion = questionList[currentIndex] || "";

  const handleSubmit = async () => {
    if (!sessionId) {
      alert("Session ID not found.");
      return;
    }
    try {
      await fetch("http://localhost:8000/submit_answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          question: currentQuestion,
          answer: answer,
          index: currentIndex,
        }),
      });
      setSubmitted(true); // ✅ 显示两个按钮
    } catch (err) {
      console.error("Failed to submit answer", err);
      alert("Failed to submit answer.");
    }
  };

  const handleNext = () => {
    setSubmitted(false);
    setAnswer("");
    setCurrentIndex((prev) => prev + 1);
  };

  const handleReturnHome = () => {
    router.push("/");
    
  };

  useEffect(() => {
    if (questionList.length > 0 && currentIndex >= questionList.length) {
      router.push("/thanks");
    }
  }, [currentIndex, questionList.length, router]);

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardContent className="space-y-4">
          <div className="flex justify-between items-center">
            <h1 className="text-xl font-semibold">Answer the Question</h1>
            <Button variant="outline" onClick={handleReturnHome}>Return Home</Button>
          </div>
          <p className="text-gray-800">{currentQuestion}</p>
          <Textarea
            rows={6}
            placeholder="Write your answer here..."
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
          />
        {!submitted ? (
          <Button onClick={handleSubmit} disabled={!answer}>
            Submit Answer
          </Button>
        ) : (
          <div className="flex gap-4">
            {currentIndex + 1 < questionList.length && (
              <Button onClick={handleNext}>Continue to Next Question</Button>
            )}
            <Button variant="secondary" onClick={handleReturnHome}>
              Return Home
            </Button>
          </div>
        )}
        </CardContent>
      </Card>
      {submitted && (
        <p className="text-green-600">✅ Your answer has been submitted!</p>
      )}
    </div>
    
  );
}
