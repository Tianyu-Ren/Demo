"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";

export default function RegulationExtraction() {
  const router = useRouter();

  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [startPage, setStartPage] = useState(1);
  const [endPage, setEndPage] = useState(1);
  const [showPageSelector, setShowPageSelector] = useState(false);
  const [extractedData, setExtractedData] = useState([]);
  const [extracting, setExtracting] = useState(false);
  const [questionGenerating, setQuestionGenerating] = useState(false);
  const [generatedQuestions, setGeneratedQuestions] = useState([]);
  const [sessionId, setSessionId] = useState("");
  const [hasAnswers, setHasAnswers] = useState(false);
  const [canContinue, setCanContinue] = useState(false);
  const [evaluationResults, setEvaluationResults] = useState([]);

  useEffect(() => {
    const storedSessionId = localStorage.getItem("session_id");
    if (!storedSessionId) return;

    setSessionId(storedSessionId);

    fetch(`http://localhost:8000/sessions/${storedSessionId}`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (!data) return;
        setStartPage(data.start_page);
        setEndPage(data.end_page);
        setExtractedData(data.regulations);
        setGeneratedQuestions(data.questions);
        setShowPageSelector(true);
        setCanContinue(true);
      });
  }, []);

  useEffect(() => {
    if (!sessionId) return;

    fetch(`http://localhost:8000/answers/${sessionId}.json`)
      .then(res => res.ok ? res.json() : [])
      .then(data => {
        if (data.length > 0) setHasAnswers(true);
      })
      .catch(() => {});
  }, [sessionId]);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    setFile(selectedFile);
    setShowPageSelector(false);
    setExtractedData([]);
    setGeneratedQuestions([]);
    setHasAnswers(false);
    setCanContinue(false);
    setEvaluationResults([]);
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("http://localhost:8000/upload", {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        setShowPageSelector(true);
      } else {
        alert("Upload failed");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  const handleExtract = async () => {
    if (!file) return;
    setExtracting(true);
    try {
      const response = await fetch("http://localhost:8000/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          start_page: Number(startPage),
          end_page: Number(endPage),
          document_name: file.name,
        }),
      });
      if (!response.ok) throw new Error("Extraction failed");
      const data = await response.json();
      setExtractedData(data);
    } catch (err) {
      console.error(err);
      alert("Failed to extract regulations.");
    } finally {
      setExtracting(false);
    }
  };

  const handleQuestionGeneration = async () => {
    setQuestionGenerating(true);
    try {
      const response = await fetch("http://localhost:8000/generate_questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ regulations: extractedData }),
      });
      const questions = await response.json();
      setGeneratedQuestions(questions);

      const sessionInit = await fetch("http://localhost:8000/start_session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          document_name: file.name,
          start_page: Number(startPage),
          end_page: Number(endPage),
          regulations: extractedData,
          questions,
        }),
      });
      const sessionRes = await sessionInit.json();
      localStorage.setItem("session_id", sessionRes.session_id);
      setSessionId(sessionRes.session_id);
      setCanContinue(true);
    } catch (err) {
      console.error(err);
      alert("Failed to generate questions.");
    } finally {
      setQuestionGenerating(false);
    }
  };

  const handleStartAnswering = () => {
    const url = new URL("/answer", window.location.origin);
    generatedQuestions.forEach((q) => url.searchParams.append("question", q));
    router.push(url.pathname + url.search);
  };

  const handleMarking = async () => {
    if (!sessionId) return;
    try {
      const res = await fetch("http://localhost:8000/evaluate_answers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId }),
      });
      const result = await res.json();
      if (!Array.isArray(result)) {
        alert("Evaluation failed.");
        return;
      }
      setEvaluationResults(result);
    } catch (err) {
      console.error("Evaluation failed", err);
      alert("Failed to mark answers.");
    }
  };

  const handleResetSession = () => {
    localStorage.removeItem("session_id");
    setSessionId("");
    setFile(null);
    setStartPage(1);
    setEndPage(1);
    setShowPageSelector(false);
    setExtractedData([]);
    setGeneratedQuestions([]);
    setHasAnswers(false);
    setCanContinue(false);
    setEvaluationResults([]);
    router.refresh();
  };

  return (
    <>
      {/* Fixed Logo in top-left */}
      <a href="/">
        <img
          src="/logo.png"
          alt="Logo"
          className="absolute top-4 left-4 w-56 h-auto z-50 cursor-pointer"
        />
      </a>
      {/* Top Centered Info Bar */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50 bg-white/80 px-6 py-2 rounded-xl shadow-lg backdrop-blur-md text-center text-base font-semibold text-gray-800 tracking-wide">
        <span className="text-lg font-bold text-blue-700">Tianyu Ren</span> – ARC QUB PhD Candidate – <span className="text-blue-600">Tren01@qub.ac.uk</span>
      </div>

      <div className="relative min-h-screen">
        <div className="p-6 space-y-6">
          <div className="flex justify-end">
            <Button variant="destructive" onClick={handleResetSession}>
              Start New Session
            </Button>
          </div>

          {/* Upload & Extract */}
          <Card>
            <CardContent className="space-y-4 p-4">
              <div className="space-y-2">
                <Input type="file" accept="application/pdf" onChange={handleFileChange} />
                <Button onClick={handleUpload} disabled={!file || uploading}>
                  {uploading ? "Processing..." : "Upload Document"}
                </Button>
              </div>
              {showPageSelector && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Input type="number" value={startPage} onChange={(e) => setStartPage(e.target.value)} />
                    <Input type="number" value={endPage} onChange={(e) => setEndPage(e.target.value)} />
                  </div>
                  <Button onClick={handleExtract} disabled={extracting}>
                    {extracting ? "Extracting..." : "Regulation Extraction"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Extracted Regulations */}
          {extractedData.length > 0 && (
            <Card>
              <CardContent className="p-4 space-y-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Original Text</TableHead>
                      <TableHead>Regulation</TableHead>
                      <TableHead>Keyword</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {extractedData.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>{item.original}</TableCell>
                        <TableCell>{item.regulation}</TableCell>
                        <TableCell>{item.keyword}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <Button onClick={handleQuestionGeneration} disabled={questionGenerating}>
                  {questionGenerating ? "Generating Questions..." : "Generate Questions"}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Generated Questions */}
          {generatedQuestions.length > 0 && (
            <Card>
              <CardContent className="p-4 space-y-2">
                <h2 className="text-xl font-semibold">Generated Questions</h2>
                <ul className="list-disc pl-5">
                  {generatedQuestions.map((q, i) => (
                    <li key={i} className="text-blue-600">{q}</li>
                  ))}
                </ul>
                <Button onClick={handleStartAnswering}>Start Answering</Button>
              </CardContent>
            </Card>
          )}

          {/* Session Options */}
          {sessionId && (hasAnswers || canContinue) && (
            <Card>
              <CardContent className="p-4 space-y-2">
                <h2 className="text-xl font-semibold">Session Options</h2>
                <div className="flex gap-4">
                  {canContinue && (
                    <Button
                      onClick={async () => {
                        const res = await fetch(`http://localhost:8000/sessions/${sessionId}`);
                        const session = await res.json();
                        const index = session.current_index ?? 0;

                        const url = new URL("/answer", window.location.origin);
                        url.searchParams.append("start", index);
                        session.questions.forEach((q) => url.searchParams.append("question", q));
                        router.push(url.pathname + url.search);
                      }}
                    >
                      Continue Answering
                    </Button>
                  )}
                  {hasAnswers && (
                    <Button onClick={handleMarking} variant="secondary">
                      Start Marking
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Evaluation Table */}
          {evaluationResults.length > 0 && (
            <Card>
              <CardContent className="p-4 space-y-2">
                <h2 className="text-xl font-semibold">Evaluation Results</h2>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Question</TableHead>
                      <TableHead>Gold Answer</TableHead>
                      <TableHead>Your Answer</TableHead>
                      <TableHead>Judgment</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {evaluationResults.map((r, i) => (
                      <TableRow key={i}>
                        <TableCell>{r.question}</TableCell>
                        <TableCell>{r.gold_answer}</TableCell>
                        <TableCell>{r.your_answer}</TableCell>
                        <TableCell>{r.judgment}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}