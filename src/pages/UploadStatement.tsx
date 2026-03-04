import { useState, useRef } from "react";
import { Upload, FileText, CheckCircle2, AlertCircle, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useUploadStatement } from "@/hooks/use-finance-data";
import type { UploadStatementResponse } from "@/types/finance";
import { useAppPreferences } from "@/contexts/AppPreferencesContext";

const UploadStatement = () => {
  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const [message, setMessage] = useState<string>("");
  const [uploadSummary, setUploadSummary] = useState<UploadStatementResponse | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadMutation = useUploadStatement();
  const { role } = useAppPreferences();

  const formatDateTime = (value: string) => {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toLocaleString();
  };

  const validateFile = (selectedFile: File) => {
    const allowed = ["csv", "doc", "docx", "pdf"];
    const ext = selectedFile.name.split(".").pop()?.toLowerCase();
    if (!ext || !allowed.includes(ext)) {
      setStatus("error");
      setMessage("Only CSV, DOC, DOCX, and PDF files are supported.");
      return false;
    }
    if (selectedFile.size > 10 * 1024 * 1024) {
      setStatus("error");
      setMessage("File is too large. Please upload a file under 10 MB.");
      return false;
    }
    return true;
  };

  const selectFile = (selectedFile: File) => {
    if (!validateFile(selectedFile)) {
      setFile(null);
      return;
    }
    setFile(selectedFile);
    setStatus("idle");
    setMessage("");
    setUploadSummary(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) {
      selectFile(dropped);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      selectFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    if (role !== "admin") {
      setStatus("error");
      setMessage("Only admins can upload statements.");
      return;
    }
    setStatus("uploading");
    setMessage("");

    try {
      const result = await uploadMutation.mutateAsync(file);
      setStatus("success");
      setMessage(result.message);
      setUploadSummary(result);
    } catch {
      setStatus("error");
      setMessage("Failed to process. Check the file format and try again.");
      setUploadSummary(null);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4 sm:space-y-6 px-1">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-foreground">Upload Statement</h2>
        <p className="text-sm text-muted-foreground mt-1">Upload your CSV, DOC, DOCX, or PDF statement to process transactions</p>
        {role !== "admin" && <p className="text-xs text-destructive mt-2">Read-only mode: upload is restricted to admin users.</p>}
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <Card className="card-shadow">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-base sm:text-lg">Bank Statement Upload</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Drag and drop your file or click to browse</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 sm:space-y-6 p-4 sm:p-6 pt-0">
            <motion.div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className={`border-2 border-dashed rounded-xl p-8 sm:p-12 text-center transition-all duration-200 cursor-pointer ${
                dragOver
                  ? "border-primary bg-accent"
                  : "border-border hover:border-primary/50 hover:bg-accent/50"
              }`}
              onClick={() => fileInputRef.current?.click()}
            >
              <input ref={fileInputRef} id="file-input" type="file" accept=".csv,.doc,.docx,.pdf" className="hidden" onChange={handleFileChange} />
              <div className="flex flex-col items-center gap-3">
                <motion.div
                  className="h-14 w-14 sm:h-16 sm:w-16 rounded-2xl bg-gradient-to-br from-primary to-chart-4 flex items-center justify-center"
                  animate={dragOver ? { scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] } : {}}
                  transition={{ repeat: Infinity, duration: 0.5 }}
                >
                  <Upload className="h-7 w-7 sm:h-8 sm:w-8 text-primary-foreground" />
                </motion.div>
                <div>
                  <p className="font-semibold text-sm sm:text-base text-foreground">
                    {file ? file.name : "Drop your statement here"}
                  </p>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1">Supported formats: CSV, DOC, DOCX, PDF</p>
                </div>
              </div>
            </motion.div>

            <AnimatePresence>
              {file && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText className="h-5 w-5 text-primary shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{file.name}</p>
                      <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => { setFile(null); setStatus("idle"); setUploadSummary(null); }}>
                    <X className="h-4 w-4" />
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>

            <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}>
              <Button
                onClick={handleUpload}
                disabled={!file || status === "uploading" || role !== "admin"}
                className="w-full bg-gradient-to-r from-primary to-chart-4 hover:opacity-90 transition-opacity"
              >
                {status === "uploading" ? (
                  <motion.span animate={{ opacity: [1, 0.5, 1] }} transition={{ repeat: Infinity, duration: 1 }}>
                    Processing...
                  </motion.span>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Statement
                  </>
                )}
              </Button>
            </motion.div>

            <AnimatePresence>
              {status === "success" && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <Alert className="border-success/30 bg-success/10">
                    <CheckCircle2 className="h-4 w-4 text-success" />
                    <AlertDescription className="text-success text-sm">
                      {message || "Statement uploaded successfully."}
                    </AlertDescription>
                  </Alert>
                  {uploadSummary && (
                    <div className="mt-2 rounded-md border border-success/30 bg-success/10 p-3 text-xs sm:text-sm text-success">
                      <p>Transactions saved: {uploadSummary.transactionsSaved}</p>
                      <p>Days updated: {uploadSummary.dailyClosingDays}</p>
                      {uploadSummary.extractedRange && (
                        <p>
                          Extracted range: {formatDateTime(uploadSummary.extractedRange.from)} to {formatDateTime(uploadSummary.extractedRange.to)}
                        </p>
                      )}
                    </div>
                  )}
                </motion.div>
              )}
              {status === "error" && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-sm">
                      {message || "Failed to process. Check the file format and try again."}
                    </AlertDescription>
                  </Alert>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default UploadStatement;
