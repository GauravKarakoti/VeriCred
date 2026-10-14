package main

import (
	"fmt"
	"io/fs"
	"log"
	"net/http"
	"net/http/httputil"
	"net/url"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"sync"
	"time"
)

var (
	mu           sync.Mutex
	rateLimitMap = make(map[string][]time.Time)
)

func isRateLimited(ip string) bool {
	mu.Lock()
	defer mu.Unlock()

	now := time.Now()
	windowStart := now.Add(-1 * time.Minute)
	var valid []time.Time
	for _, t := range rateLimitMap[ip] {
		if t.After(windowStart) {
			valid = append(valid, t)
		}
	}
	if len(valid) >= 10 {
		rateLimitMap[ip] = valid
		return true
	}
	valid = append(valid, now)
	rateLimitMap[ip] = valid
	return false
}

func findProofServerBinary() string {
	if p, err := exec.LookPath("midnight-proof-server"); err == nil {
		return p
	}
	var found string
	_ = filepath.WalkDir("/", func(path string, d fs.DirEntry, err error) error {
		if err == nil && !d.IsDir() && d.Name() == "midnight-proof-server" {
			found = path
			return filepath.SkipAll
		}
		return nil
	})
	if found != "" {
		return found
	}
	return "midnight-proof-server"
}

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	allowedOrigin := os.Getenv("ALLOWED_ORIGIN")
	if allowedOrigin == "" {
		allowedOrigin = "https://veri-cred.vercel.app"
	}

	binPath := findProofServerBinary()
	log.Printf("🚀 Starting Midnight Proof Server (%s -v) on internal port 6300...", binPath)

	cmd := exec.Command(binPath, "-v")
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	cmd.Env = append(os.Environ(), "RUST_BACKTRACE=full")

	if err := cmd.Start(); err != nil {
		log.Fatalf("❌ Failed to start midnight-proof-server: %v", err)
	}

	go func() {
		err := cmd.Wait()
		log.Fatalf("❌ midnight-proof-server exited: %v", err)
	}()

	target, _ := url.Parse("http://127.0.0.1:6300")
	proxy := httputil.NewSingleHostReverseProxy(target)

	// Strip any upstream CORS headers so the browser never sees duplicate headers
	proxy.ModifyResponse = func(resp *http.Response) error {
		resp.Header.Del("Access-Control-Allow-Origin")
		resp.Header.Del("Access-Control-Allow-Methods")
		resp.Header.Del("Access-Control-Allow-Headers")
		return nil
	}

	proxy.ErrorHandler = func(w http.ResponseWriter, r *http.Request, err error) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusServiceUnavailable)
		_, _ = fmt.Fprintf(w, `{"error":"Proof server is still warming up or downloading ZK parameters. Try again in 30 seconds.","details":%q}`, err.Error())
	}

	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		if allowedOrigin == "*" || origin == allowedOrigin {
			if origin != "" {
				w.Header().Set("Access-Control-Allow-Origin", origin)
			} else {
				w.Header().Set("Access-Control-Allow-Origin", "*")
			}
		} else {
			w.Header().Set("Access-Control-Allow-Origin", allowedOrigin)
		}
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}

		// Instant 200 OK for Render's health check while ZK parameters download in the background
		if (r.Method == http.MethodGet || r.Method == http.MethodHead) && (r.URL.Path == "/" || r.URL.Path == "/healthz") {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusOK)
			_, _ = w.Write([]byte(`{"status":"ok","service":"vericred-proof-gateway"}`))
			return
		}

		if r.Method == http.MethodPost {
			ip := r.RemoteAddr
			if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
				ip = strings.TrimSpace(strings.Split(xff, ",")[0])
			}
			if isRateLimited(ip) {
				http.Error(w, "Too many ZK proofs requested, please try again in a minute.", http.StatusTooManyRequests)
				return
			}
		}

		proxy.ServeHTTP(w, r)
	})

	log.Printf("🛡️ ZK Proof Gateway listening on 0.0.0.0:%s -> http://127.0.0.1:6300", port)
	if err := http.ListenAndServe("0.0.0.0:"+port, handler); err != nil {
		log.Fatalf("❌ Gateway server failed: %v", err)
	}
}