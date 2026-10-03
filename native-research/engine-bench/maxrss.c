#include <fcntl.h>
#include <stdio.h>
#include <sys/resource.h>
#include <sys/wait.h>
#include <unistd.h>
int main(int argc, char **argv) {
  pid_t p = fork();
  if (p == 0) { int fd = open("/dev/null", 1); dup2(fd, 1); dup2(fd, 2); execvp(argv[1], argv + 1); _exit(127); }
  int st; struct rusage ru; wait4(p, &st, 0, &ru);
  printf("%.1f\n", ru.ru_maxrss / 1024.0); return 0;
}
